const { supabase } = require('../config/supabase');

/**
 * Get all active jobs with filters and search
 */
const getAllJobs = async (req, res) => {
  try {
    const {
      search = '',
      jobType,
      workMode,
      experienceLevel,
      country,
      city,
      location, // Added location parameter to handle city filtering from frontend
      isStudentFriendly,
      sortBy = 'created_at',
      order = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    let query = supabase
      .from('jobs')
      .select(`
        *,
        job_skills(skill_name),
        recruiter_profiles!inner(
          company_name,
          company_logo_url,
          company_website
        )
      `, { count: 'exact' })
      .eq('status', 'active');

    // Search in job title, company name, description
    if (search) {
      query = query.or(`job_title.ilike.%${search}%,job_description.ilike.%${search}%`);
    }

    // Filters
    if (jobType) {
      query = query.eq('job_type', jobType);
    }
    if (workMode) {
      query = query.eq('work_mode', workMode);
    }
    if (experienceLevel) {
      query = query.eq('experience_level', experienceLevel);
    }
    if (country) {
      query = query.eq('country', country);
    }
    // Handle both 'city' and 'location' parameters for filtering by city
    // 'location' is sent from frontend, 'city' is for backward compatibility
    const cityFilter = city || location;
    if (cityFilter) {
      // Use case-insensitive matching for better search results
      query = query.ilike('city', `%${cityFilter}%`);
    }
    if (isStudentFriendly === 'true') {
      query = query.eq('is_student_friendly', true);
    }

    // Sorting
    query = query.order(sortBy, { ascending: order === 'asc' });

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: jobs, error, count } = await query;

    if (error) throw error;

    res.json({
      jobs: jobs || [],
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get all jobs error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch jobs'
    });
  }
};

/**
 * Get single job by ID
 */
const getJobById = async (req, res) => {
  try {
    const { jobId } = req.params;

    const { data: job, error } = await supabase
      .from('jobs')
      .select(`
        *,
        job_skills(skill_name),
        recruiter_profiles!inner(
          id,
          user_id,
          company_name,
          company_logo_url,
          company_website,
          company_size,
          industry,
          company_description,
          country,
          city
        )
      `)
      .eq('id', jobId)
      .single();

    if (error || !job) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Job not found'
      });
    }

    // Only show draft jobs to the job owner
    if (job.status === 'draft') {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'This job is not published yet'
        });
      }

      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);

      if (!user || user.id !== job.recruiter_profiles.user_id) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'This job is not published yet'
        });
      }
    }

    res.json({
      job: job
    });
  } catch (error) {
    console.error('Get job by ID error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch job'
    });
  }
};

/**
 * Increment job view count
 */
const incrementViewCount = async (req, res) => {
  try {
    const { jobId } = req.params;

    const { error } = await supabase.rpc('increment', {
      row_id: jobId,
      x: 1
    });

    // If RPC doesn't exist, fallback to direct update
    if (error) {
      const { data: job } = await supabase
        .from('jobs')
        .select('view_count')
        .eq('id', jobId)
        .single();

      await supabase
        .from('jobs')
        .update({ view_count: (job?.view_count || 0) + 1 })
        .eq('id', jobId);
    }

    res.json({
      message: 'View count updated'
    });
  } catch (error) {
    console.error('Increment view count error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update view count'
    });
  }
};

/**
 * Get recruiter's own jobs
 */
const getRecruiterJobs = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;

    // Get the user's JWT token from the request
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;

    // Create a Supabase client with the user's JWT token
    const { createClient } = require('@supabase/supabase-js');
    const userSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // Get recruiter profile - use admin client to ensure we find it even if RLS is being tricky
    const { supabaseAdmin } = require('../config/supabase');
    let { data: recruiterProfile, error: profileError } = await supabaseAdmin
      .from('recruiter_profiles')

      .select('id, user_id, company_name')
      .eq('user_id', userId)
      .single();

    // Add id property if missing (use user_id as fallback for now)
    if (recruiterProfile && !recruiterProfile.id) {
      recruiterProfile.id = recruiterProfile.user_id;
    }

    // If recruiter profile doesn't exist, create it automatically
    if (!recruiterProfile || profileError) {
      console.log('Recruiter profile not found, creating default profile for user:', userId);

      // Get user's profile info
      const { data: userProfile } = await userSupabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single();

      // Create default recruiter profile
      try {
        const { supabaseAdmin } = require('../config/supabase'); // Import admin client
        const { data: newProfile, error: createError } = await supabaseAdmin
          .from('recruiter_profiles')
          .insert({
            user_id: userId,
            company_name: userProfile?.full_name ? `${userProfile.full_name}'s Company` : 'My Company',
            country: 'Bangladesh',
            city: 'Dhaka'
          })
          .select()
          .single();

        if (createError) throw createError;
        recruiterProfile = newProfile;
      } catch (err) {
        // Retry with minimal fields if column missing
        if (err.message && err.message.includes('column') && err.message.includes('does not exist')) {
          console.warn('Column missing in database, falling back to minimal job controller insert:', err.message);
          const { supabaseAdmin } = require('../config/supabase');
          const { data: minimalProfile, error: minimalError } = await supabaseAdmin
            .from('recruiter_profiles')
            .insert({
              user_id: userId,
              company_name: userProfile?.full_name ? `${userProfile.full_name}'s Company` : 'My Company',
              country: 'Bangladesh',
              city: 'Dhaka'
            })
            .select()
            .single();

          if (minimalError) {
            console.error('Error creating recruiter profile (minimal):', minimalError);
            return res.status(500).json({
              error: 'Internal Server Error',
              message: 'Failed to create recruiter profile. Please try again.'
            });
          }
          recruiterProfile = minimalProfile;
        } else {
          console.error('Error creating recruiter profile:', err);
          return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to create recruiter profile. Please try again.'
          });
        }
      }

      // Fallback id if still missing
      if (recruiterProfile && !recruiterProfile.id) {
        recruiterProfile.id = recruiterProfile.user_id;
      }
      console.log('Successfully created recruiter profile:', recruiterProfile.id);
    }

    let query = userSupabase
      .from('jobs')
      .select(`
        *,
        job_skills(skill_name)
      `, { count: 'exact' })
      .eq('recruiter_id', recruiterProfile.id);

    // Filter by status
    if (status && ['draft', 'active', 'closed'].includes(status)) {
      query = query.eq('status', status);
    }

    // Sort by most recent
    query = query.order('created_at', { ascending: false });

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: jobs, error, count } = await query;

    if (error) throw error;

    // Get application counts for each job
    const jobsWithApplicationCounts = await Promise.all(
      (jobs || []).map(async (job) => {
        const { count: applicationCount, error: countError } = await userSupabase
          .from('job_applications')
          .select('*', { count: 'exact', head: true })
          .eq('job_id', job.id);

        console.log(`Application count for job ${job.id} (${job.job_title}):`, { count: applicationCount, error: countError });

        return {
          ...job,
          application_count: applicationCount || 0
        };
      })
    );

    // Get stats
    const { data: stats } = await userSupabase
      .from('jobs')
      .select('status')
      .eq('recruiter_id', recruiterProfile.id);

    const jobStats = {
      total: stats?.length || 0,
      active: stats?.filter(j => j.status === 'active').length || 0,
      draft: stats?.filter(j => j.status === 'draft').length || 0,
      closed: stats?.filter(j => j.status === 'closed').length || 0
    };

    res.json({
      jobs: jobsWithApplicationCounts || [],
      stats: jobStats,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get recruiter jobs error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch jobs'
    });
  }
};

/**
 * Create new job
 */
const createJob = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      jobTitle,
      department,
      jobType,
      workMode,
      experienceLevel,
      country,
      city,
      address,
      salaryMin,
      salaryMax,
      salaryCurrency,
      salaryPeriod,
      jobDescription,
      responsibilities,
      qualifications,
      niceToHave,
      benefits,
      requiredSkills,
      applicationDeadline,
      numberOfPositions,
      isStudentFriendly,
      minimumExperienceYears,
      status
    } = req.validatedData;

    // Get the user's JWT token from the request
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;

    // Create a Supabase client with the user's JWT token
    const { createClient } = require('@supabase/supabase-js');
    const userSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // Get recruiter profile
    const { data: recruiterProfile } = await userSupabase
      .from('recruiter_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!recruiterProfile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Recruiter profile not found. Please complete your profile first.'
      });
    }

    // Create job
    const { data: job, error: jobError } = await userSupabase
      .from('jobs')
      .insert({
        recruiter_id: recruiterProfile.id,
        job_title: jobTitle,
        department,
        job_type: jobType,
        work_mode: workMode,
        experience_level: experienceLevel,
        country,
        city,
        address,
        salary_min: salaryMin,
        salary_max: salaryMax,
        salary_currency: salaryCurrency,
        salary_period: salaryPeriod,
        job_description: jobDescription,
        responsibilities,
        qualifications,
        nice_to_have: niceToHave,
        benefits,
        application_deadline: applicationDeadline,
        number_of_positions: numberOfPositions,
        is_student_friendly: isStudentFriendly,
        minimum_experience_years: minimumExperienceYears,
        status: status || 'draft'
      })
      .select()
      .single();

    if (jobError) throw jobError;

    // Add skills
    if (requiredSkills && requiredSkills.length > 0) {
      const skillsToInsert = requiredSkills.map(skill => ({
        job_id: job.id,
        skill_name: skill
      }));

      const { error: skillsError } = await userSupabase
        .from('job_skills')
        .insert(skillsToInsert);

      if (skillsError) {
        console.error('Skills insert error:', skillsError);
      }
    }

    // Fetch complete job with skills
    const { data: completeJob } = await userSupabase
      .from('jobs')
      .select(`
        *,
        job_skills(skill_name)
      `)
      .eq('id', job.id)
      .single();

    // Trigger AI analysis for job skills (async, don't wait)
    try {
      const AIAnalysisService = require('../services/aiAnalysis.service');
      const extractedSkills = await AIAnalysisService.extractJobSkills({
        jobTitle: jobTitle,
        department: department,
        jobDescription: jobDescription,
        responsibilities: responsibilities,
        qualifications: qualifications,
        niceToHave: niceToHave,
        benefits: benefits,
        requiredSkills: requiredSkills || []
      });

      // Clear existing job skills and insert AI-extracted skills
      await userSupabase
        .from('job_skills')
        .delete()
        .eq('job_id', job.id);

      if (extractedSkills.length > 0) {
        const skillsToInsert = extractedSkills.map(skill => ({
          job_id: job.id,
          skill_name: skill.skill
        }));

        await userSupabase
          .from('job_skills')
          .insert(skillsToInsert);
      }
    } catch (aiError) {
      console.error('AI analysis failed for job creation:', aiError);
      // Don't fail the job creation if AI analysis fails
    }

    res.status(201).json({
      message: 'Job created successfully',
      job: completeJob
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create job'
    });
  }
};

/**
 * Update job
 */
const updateJob = async (req, res) => {
  try {
    const userId = req.user.id;
    const { jobId } = req.params;
    const {
      jobTitle,
      department,
      jobType,
      workMode,
      experienceLevel,
      country,
      city,
      address,
      salaryMin,
      salaryMax,
      salaryCurrency,
      salaryPeriod,
      jobDescription,
      responsibilities,
      qualifications,
      niceToHave,
      benefits,
      requiredSkills,
      applicationDeadline,
      numberOfPositions,
      isStudentFriendly,
      minimumExperienceYears,
      status
    } = req.validatedData;

    // Get the user's JWT token from the request
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;

    // Create a Supabase client with the user's JWT token
    const { createClient } = require('@supabase/supabase-js');
    const userSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // Get recruiter profile
    const { data: recruiterProfile } = await userSupabase
      .from('recruiter_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    // Verify job ownership
    const { data: existingJob } = await userSupabase
      .from('jobs')
      .select('recruiter_id')
      .eq('id', jobId)
      .single();

    if (!existingJob || existingJob.recruiter_id !== recruiterProfile.id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to update this job'
      });
    }

    // Update job
    const { data: job, error: jobError } = await userSupabase
      .from('jobs')
      .update({
        job_title: jobTitle,
        department,
        job_type: jobType,
        work_mode: workMode,
        experience_level: experienceLevel,
        country,
        city,
        address,
        salary_min: salaryMin,
        salary_max: salaryMax,
        salary_currency: salaryCurrency,
        salary_period: salaryPeriod,
        job_description: jobDescription,
        responsibilities,
        qualifications,
        nice_to_have: niceToHave,
        benefits,
        application_deadline: applicationDeadline,
        number_of_positions: numberOfPositions,
        is_student_friendly: isStudentFriendly,
        minimum_experience_years: minimumExperienceYears,
        status: status
      })
      .eq('id', jobId)
      .select()
      .single();

    if (jobError) throw jobError;

    // Update skills - delete old and insert new
    await userSupabase
      .from('job_skills')
      .delete()
      .eq('job_id', jobId);

    if (requiredSkills && requiredSkills.length > 0) {
      const skillsToInsert = requiredSkills.map(skill => ({
        job_id: jobId,
        skill_name: skill
      }));

      await userSupabase
        .from('job_skills')
        .insert(skillsToInsert);
    }

    // Trigger AI analysis for updated job skills (async, don't wait)
    try {
      const AIAnalysisService = require('../services/aiAnalysis.service');
      const extractedSkills = await AIAnalysisService.extractJobSkills({
        jobTitle: jobTitle,
        department: department,
        jobDescription: jobDescription,
        responsibilities: responsibilities,
        qualifications: qualifications,
        niceToHave: niceToHave,
        benefits: benefits,
        requiredSkills: requiredSkills || []
      });

      // Clear existing job skills and insert AI-extracted skills
      await userSupabase
        .from('job_skills')
        .delete()
        .eq('job_id', jobId);

      if (extractedSkills.length > 0) {
        const skillsToInsert = extractedSkills.map(skill => ({
          job_id: jobId,
          skill_name: skill.skill
        }));

        await userSupabase
          .from('job_skills')
          .insert(skillsToInsert);
      }

      // Trigger re-analysis for all existing candidates who viewed this job
      // Clear both analysis and recommendations cache
      await supabase
        .from('job_skill_analysis')
        .delete()
        .eq('job_id', jobId);

      try {
        await supabase
          .from('job_skill_recommendations')
          .delete()
          .eq('job_id', jobId);
      } catch (cacheError) {
        // Table might not exist, skip
        console.log('Recommendations cache not available for clearing:', cacheError.message);
      }

      // Clear learning roadmaps for all candidates who have this job in their interested list
      const { data: interestedCandidates } = await supabase
        .from('interested_jobs')
        .select('candidate_id')
        .eq('job_id', jobId);

      if (interestedCandidates && interestedCandidates.length > 0) {
        const candidateIds = interestedCandidates.map(c => c.candidate_id);
        await supabase
          .from('candidate_learning_roadmaps')
          .delete()
          .in('candidate_id', candidateIds);
      }
    } catch (aiError) {
      console.error('AI analysis failed for job update:', aiError);
      // Don't fail the job update if AI analysis fails
    }

    // Fetch complete job with skills
    const { data: completeJob } = await userSupabase
      .from('jobs')
      .select(`
        *,
        job_skills(skill_name)
      `)
      .eq('id', jobId)
      .single();

    res.json({
      message: 'Job updated successfully',
      job: completeJob
    });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update job'
    });
  }
};

/**
 * Delete job
 */
const deleteJob = async (req, res) => {
  try {
    const userId = req.user.id;
    const { jobId } = req.params;

    // Get the user's JWT token from the request
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;

    // Create a Supabase client with the user's JWT token
    const { createClient } = require('@supabase/supabase-js');
    const userSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // Get recruiter profile
    const { data: recruiterProfile } = await userSupabase
      .from('recruiter_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    // Verify job ownership
    const { data: existingJob } = await userSupabase
      .from('jobs')
      .select('recruiter_id')
      .eq('id', jobId)
      .single();

    if (!existingJob || existingJob.recruiter_id !== recruiterProfile.id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to delete this job'
      });
    }

    // Delete job (cascade will delete job_skills)
    const { error } = await userSupabase
      .from('jobs')
      .delete()
      .eq('id', jobId);

    if (error) throw error;

    res.json({
      message: 'Job deleted successfully'
    });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete job'
    });
  }
};

/**
 * Update job status only
 */
const updateJobStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { jobId } = req.params;
    const { status } = req.body;

    if (!status || !['draft', 'active', 'closed'].includes(status)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid status. Must be one of: draft, active, closed'
      });
    }

    // Get the user's JWT token from the request
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;

    // Create a Supabase client with the user's JWT token
    const { createClient } = require('@supabase/supabase-js');
    const userSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // Get recruiter profile
    const { data: recruiterProfile } = await userSupabase
      .from('recruiter_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    // Verify job ownership
    const { data: existingJob } = await userSupabase
      .from('jobs')
      .select('recruiter_id')
      .eq('id', jobId)
      .single();

    if (!existingJob || existingJob.recruiter_id !== recruiterProfile.id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to update this job'
      });
    }

    // Update status
    const { data: job, error } = await userSupabase
      .from('jobs')
      .update({ status })
      .eq('id', jobId)
      .select()
      .single();

    if (error) throw error;

    res.json({
      message: 'Job status updated successfully',
      job
    });
  } catch (error) {
    console.error('Update job status error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update job status'
    });
  }
};

module.exports = {
  getAllJobs,
  getJobById,
  incrementViewCount,
  getRecruiterJobs,
  createJob,
  updateJob,
  deleteJob,
  updateJobStatus
};

