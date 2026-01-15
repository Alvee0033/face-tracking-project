const { supabase, supabaseAdmin } = require('../config/supabase');
const AIAnalysisService = require('../services/aiAnalysis.service');

/**
 * Save/bookmark a job
 */
const saveJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    // Get candidate profile
    const { data: candidateProfile, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (candidateError || !candidateProfile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Candidate profile not found'
      });
    }

    // Verify job exists
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, job_title')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Job not found'
      });
    }

    // Save the job using supabaseAdmin to ensure trigger fires
    const { data: savedJob, error: saveError } = await supabaseAdmin
      .from('saved_jobs')
      .insert({
        candidate_id: candidateProfile.id,
        job_id: jobId
      })
      .select()
      .single();

    if (saveError) {
      // Check if already saved
      if (saveError.code === '23505') {
        // Job is already saved, return success
        const { data: existingJob } = await supabase
          .from('saved_jobs')
          .select()
          .eq('candidate_id', candidateProfile.id)
          .eq('job_id', jobId)
          .single();

        return res.status(200).json({
          message: 'Job was already saved',
          savedJob: existingJob
        });
      }
      throw saveError;
    }

    res.status(201).json({
      message: 'Job saved successfully',
      savedJob: savedJob
    });

  } catch (error) {
    console.error('Save job error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to save job'
    });
  }
};

/**
 * Remove saved job
 */
const removeSavedJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    // Get candidate profile
    const { data: candidateProfile, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (candidateError || !candidateProfile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Candidate profile not found'
      });
    }

    // Remove saved job using supabaseAdmin to ensure trigger fires
    const { error: deleteError } = await supabaseAdmin
      .from('saved_jobs')
      .delete()
      .eq('candidate_id', candidateProfile.id)
      .eq('job_id', jobId);

    if (deleteError) {
      throw deleteError;
    }

    res.json({
      message: 'Saved job removed successfully'
    });

  } catch (error) {
    console.error('Remove saved job error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to remove saved job'
    });
  }
};

/**
 * Get all saved jobs for a candidate
 */
const getSavedJobs = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get candidate profile
    const { data: candidateProfile, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (candidateError || !candidateProfile) {
      // Profile not found - return empty list instead of error
      return res.json({
        message: 'Saved jobs retrieved successfully',
        savedJobs: [],
        count: 0
      });
    }

    // Get saved jobs with full job details
    const { data: savedJobs, error: savedError } = await supabaseAdmin
      .from('saved_jobs')
      .select(`
        id,
        saved_at,
        jobs (
          id,
          job_title,
          department,
          job_type,
          work_mode,
          experience_level,
          country,
          city,
          salary_min,
          salary_max,
          salary_currency,
          job_description,
          status,
          created_at,
          recruiter_profiles (
            company_name,
            company_logo_url
          )
        )
      `)
      .eq('candidate_id', candidateProfile.id)
      .order('saved_at', { ascending: false });

    if (savedError) {
      throw savedError;
    }

    console.log('Saved jobs response:', JSON.stringify({
      count: savedJobs?.length || 0,
      sample: savedJobs?.[0] || null
    }));

    res.json({
      message: 'Saved jobs retrieved successfully',
      savedJobs: savedJobs || [],
      count: savedJobs?.length || 0
    });

  } catch (error) {
    console.error('Get saved jobs error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve saved jobs'
    });
  }
};

/**
 * Add job to interested list
 */
const addInterestedJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    // Get candidate profile
    const { data: candidateProfile, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (candidateError || !candidateProfile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Candidate profile not found'
      });
    }

    // Verify job exists
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, job_title')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Job not found'
      });
    }

    // Add to interested jobs using supabaseAdmin
    const { data: interestedJob, error: interestedError } = await supabaseAdmin
      .from('interested_jobs')
      .insert({
        candidate_id: candidateProfile.id,
        job_id: jobId
      })
      .select()
      .single();

    if (interestedError) {
      // Check if already interested
      if (interestedError.code === '23505') {
        // Job is already in interested list, return success
        const { data: existingJob } = await supabase
          .from('interested_jobs')
          .select()
          .eq('candidate_id', candidateProfile.id)
          .eq('job_id', jobId)
          .single();

        return res.status(200).json({
          message: 'Job was already in interested list',
          interestedJob: existingJob
        });
      }
      throw interestedError;
    }

    // Invalidate learning roadmap cache
    await supabaseAdmin
      .from('candidate_learning_roadmaps')
      .delete()
      .eq('candidate_id', candidateProfile.id);

    res.status(201).json({
      message: 'Job added to interested list',
      interestedJob: interestedJob
    });

  } catch (error) {
    console.error('Add interested job error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to add interested job'
    });
  }
};

/**
 * Remove job from interested list
 */
const removeInterestedJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    // Get candidate profile
    const { data: candidateProfile, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (candidateError || !candidateProfile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Candidate profile not found'
      });
    }

    // Remove interested job using supabaseAdmin
    const { error: deleteError } = await supabaseAdmin
      .from('interested_jobs')
      .delete()
      .eq('candidate_id', candidateProfile.id)
      .eq('job_id', jobId);

    if (deleteError) {
      throw deleteError;
    }

    // Invalidate learning roadmap cache
    await supabaseAdmin
      .from('candidate_learning_roadmaps')
      .delete()
      .eq('candidate_id', candidateProfile.id);

    res.json({
      message: 'Job removed from interested list'
    });

  } catch (error) {
    console.error('Remove interested job error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to remove interested job'
    });
  }
};

/**
 * Get all interested jobs for a candidate
 */
const getInterestedJobs = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get candidate profile
    const { data: candidateProfile, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (candidateError || !candidateProfile) {
      // Profile not found - return empty list instead of error
      return res.json({
        message: 'Interested jobs retrieved successfully',
        interestedJobs: [],
        count: 0
      });
    }

    // Get interested jobs with full job details
    const { data: interestedJobs, error: interestedError } = await supabaseAdmin
      .from('interested_jobs')
      .select(`
        id,
        added_at,
        jobs (
          id,
          job_title,
          department,
          job_type,
          work_mode,
          experience_level,
          country,
          city,
          salary_min,
          salary_max,
          salary_currency,
          job_description,
          status,
          created_at,
          recruiter_profiles (
            company_name,
            company_logo_url
          )
        )
      `)
      .eq('candidate_id', candidateProfile.id)
      .order('added_at', { ascending: false });

    if (interestedError) {
      throw interestedError;
    }

    console.log('Interested jobs response:', JSON.stringify({
      count: interestedJobs?.length || 0,
      sample: interestedJobs?.[0] || null
    }));

    res.json({
      message: 'Interested jobs retrieved successfully',
      interestedJobs: interestedJobs || [],
      count: interestedJobs?.length || 0
    });

  } catch (error) {
    console.error('Get interested jobs error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve interested jobs'
    });
  }
};

/**
 * Generate/Get learning roadmap based on interested jobs
 */
const getLearningRoadmap = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get candidate profile
    const { data: candidateProfile, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (candidateError || !candidateProfile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Candidate profile not found'
      });
    }

    // Check for cached roadmap (within 7 days) unless force regenerate is requested
    const forceRegenerate = req.query.force === 'true';

    if (!forceRegenerate) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: cachedRoadmap } = await supabase
        .from('candidate_learning_roadmaps')
        .select('*')
        .eq('candidate_id', candidateProfile.id)
        .gte('generated_date', sevenDaysAgo)
        .single();

      if (cachedRoadmap) {
        console.log('Using cached roadmap');
        return res.json({
          message: 'Using cached learning roadmap',
          roadmap: cachedRoadmap.roadmap_data,
          total_skills_needed: cachedRoadmap.total_skills_needed,
          total_time_estimate: cachedRoadmap.total_time_estimate,
          source_job_ids: cachedRoadmap.source_job_ids,
          generated_date: cachedRoadmap.generated_date,
          cached: true
        });
      }
    } else {
      console.log('Force regenerate requested - clearing cache');
      await supabaseAdmin
        .from('candidate_learning_roadmaps')
        .delete()
        .eq('candidate_id', candidateProfile.id);
    }

    // Get interested jobs with skills
    const { data: interestedJobs, error: interestedError } = await supabaseAdmin
      .from('interested_jobs')
      .select(`
        job_id,
        jobs (
          id,
          job_title,
          department,
          experience_level,
          job_skills (
            skill_name
          )
        )
      `)
      .eq('candidate_id', candidateProfile.id); if (interestedError) {
        throw interestedError;
      }

    console.log('Roadmap generation - Interested jobs found:', interestedJobs?.length || 0);
    console.log('Roadmap generation - Sample job data:', interestedJobs?.[0] || null);

    // No interested jobs = no roadmap
    if (!interestedJobs || interestedJobs.length === 0) {
      console.log('Roadmap generation - No interested jobs found for candidate:', candidateProfile.id);
      return res.json({
        message: 'No interested jobs found. Add jobs to your interested list to generate a roadmap.',
        roadmap: null
      });
    }

    // Get candidate skills
    const { data: candidateSkills, error: skillsError } = await supabase
      .from('candidate_skills')
      .select('skill_name, skill_level')
      .eq('candidate_id', candidateProfile.id);

    if (skillsError) {
      throw skillsError;
    }

    console.log('Roadmap generation - Candidate skills found:', candidateSkills?.length || 0);
    console.log('Roadmap generation - Candidate skills sample:', candidateSkills?.slice(0, 3) || []);

    // Get candidate's current courses
    const { data: currentCourses, error: coursesError } = await supabase
      .from('candidate_courses')
      .select('*')
      .eq('candidate_id', candidateProfile.id)
      .eq('is_archived', false);

    if (coursesError) {
      console.error('Error fetching courses:', coursesError);
    }

    console.log('Roadmap generation - Current courses found:', currentCourses?.length || 0);

    // Format jobs for AI
    const jobsForAI = interestedJobs.map(item => ({
      id: item.jobs.id,
      job_title: item.jobs.job_title,
      department: item.jobs.department,
      experience_level: item.jobs.experience_level,
      skills: item.jobs.job_skills || []
    }));

    console.log('Roadmap generation - Jobs formatted for AI:', jobsForAI.length);
    console.log('Roadmap generation - First job skills:', jobsForAI[0]?.skills || []);

    // Check if any jobs have skills
    const jobsWithSkills = jobsForAI.filter(job => job.skills && job.skills.length > 0);
    console.log('Roadmap generation - Jobs with skills:', jobsWithSkills.length);

    // If no jobs have skills, try to extract them on the fly
    if (jobsWithSkills.length === 0) {
      console.log('Roadmap generation - No jobs have skills, attempting to extract skills on the fly...');

      for (let i = 0; i < jobsForAI.length; i++) {
        const job = interestedJobs[i].jobs;

        try {
          // Extract skills using AI
          const extractedSkills = await AIAnalysisService.extractJobSkills({
            jobTitle: job.job_title,
            department: job.department,
            jobDescription: job.job_description,
            responsibilities: job.responsibilities,
            qualifications: job.qualifications,
            niceToHave: job.nice_to_have,
            benefits: job.benefits,
            requiredSkills: []
          });

          // Add skills to the job in database
          if (extractedSkills.length > 0) {
            const skillsToInsert = extractedSkills.map(skill => ({
              job_id: job.id,
              skill_name: skill.skill
            }));

            await supabaseAdmin
              .from('job_skills')
              .delete()
              .eq('job_id', job.id);

            await supabaseAdmin
              .from('job_skills')
              .insert(skillsToInsert);

            // Update the jobsForAI array
            jobsForAI[i].skills = extractedSkills.map(skill => ({ skill_name: skill.skill }));
          }

          console.log(`Roadmap generation - Extracted ${extractedSkills.length} skills for job ${job.id}`);
        } catch (skillError) {
          console.error(`Roadmap generation - Failed to extract skills for job ${job.id}:`, skillError);
        }
      }
    }

    // Re-check after potential skill extraction
    const updatedJobsWithSkills = jobsForAI.filter(job => job.skills && job.skills.length > 0);
    if (updatedJobsWithSkills.length === 0) {
      console.log('Roadmap generation - Still no jobs have skills after extraction attempt');
      return res.json({
        message: 'Unable to extract skills from your interested jobs. Please try adding different jobs or contact support.',
        roadmap: null
      });
    }

    // Generate roadmap using simplified AI service for better reliability
    console.log('Roadmap generation - Calling simplified AI service...');
    const { generateSimplifiedRoadmap } = require('../services/roadmapSimple.service');
    const roadmap = await generateSimplifiedRoadmap(
      candidateSkills || [],
      jobsForAI
    );
    console.log('Roadmap generation - AI service completed successfully');
    console.log('Roadmap generation - Roadmap phases:', roadmap.learning_phases?.length || 0);

    // Sync courses based on AI recommendations
    if (roadmap.course_recommendations && currentCourses && currentCourses.length > 0) {
      const { courses_to_archive } = roadmap.course_recommendations;

      if (courses_to_archive && courses_to_archive.length > 0) {
        // Archive courses that are no longer needed
        const coursesToArchiveIds = currentCourses
          .filter(c => courses_to_archive.some(archiveSkill =>
            c.skill_name.toLowerCase().includes(archiveSkill.toLowerCase()) ||
            archiveSkill.toLowerCase().includes(c.skill_name.toLowerCase())
          ))
          .map(c => c.id);

        if (coursesToArchiveIds.length > 0) {
          const { error: archiveError } = await supabaseAdmin
            .from('candidate_courses')
            .update({ is_archived: true, updated_at: new Date().toISOString() })
            .in('id', coursesToArchiveIds);

          if (archiveError) {
            console.error('Error archiving courses:', archiveError);
          } else {
            console.log(`Archived ${coursesToArchiveIds.length} courses`);
          }
        }
      }
    }

    // Cache the roadmap
    const jobIds = interestedJobs.map(item => item.job_id);
    const { error: cacheError } = await supabaseAdmin
      .from('candidate_learning_roadmaps')
      .upsert({
        candidate_id: candidateProfile.id,
        roadmap_data: roadmap,
        source_job_ids: jobIds,
        total_skills_needed: roadmap.total_skills_needed,
        total_time_estimate: roadmap.total_time_estimate,
        generated_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'candidate_id'
      });

    if (cacheError) {
      console.error('Error caching roadmap:', cacheError);
    }

    res.json({
      message: 'Learning roadmap generated successfully',
      roadmap: roadmap,
      total_skills_needed: roadmap.total_skills_needed,
      total_time_estimate: roadmap.total_time_estimate,
      source_job_ids: jobIds,
      generated_date: new Date().toISOString(),
      cached: false
    });

  } catch (error) {
    console.error('Get learning roadmap error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate learning roadmap'
    });
  }
};

/**
 * Check if a job is saved by the candidate
 */
const checkJobSaved = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    // Get candidate profile
    const { data: candidateProfile, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (candidateError || !candidateProfile) {
      return res.json({ saved: false, interested: false });
    }

    // Check if saved
    const { data: savedJob } = await supabase
      .from('saved_jobs')
      .select('id')
      .eq('candidate_id', candidateProfile.id)
      .eq('job_id', jobId)
      .single();

    // Check if interested
    const { data: interestedJob } = await supabase
      .from('interested_jobs')
      .select('id')
      .eq('candidate_id', candidateProfile.id)
      .eq('job_id', jobId)
      .single();

    res.json({
      saved: !!savedJob,
      interested: !!interestedJob
    });

  } catch (error) {
    console.error('Check job saved error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to check job status'
    });
  }
};

module.exports = {
  saveJob,
  removeSavedJob,
  getSavedJobs,
  addInterestedJob,
  removeInterestedJob,
  getInterestedJobs,
  getLearningRoadmap,
  checkJobSaved
};

