const { supabase, supabaseAdmin } = require('../config/supabase');
const AIAnalysisService = require('../services/aiAnalysis.service');

/**
 * Submit a job application
 */
const submitApplication = async (req, res) => {
  try {
    console.log('=== APPLICATION SUBMISSION START ===');
    console.log('Request body:', req.body);
    console.log('Validated data:', req.validatedData);
    console.log('User:', req.user);

    const userId = req.user.id;
    const { jobId, coverLetter, resumeUrl } = req.validatedData;

    console.log('Application submission request:', { userId, jobId, coverLetter, resumeUrl });

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

    // Get candidate profile
    const { data: candidateProfile, error: candidateError } = await userSupabase
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    console.log('Candidate profile lookup:', { candidateProfile, candidateError });

    if (candidateError || !candidateProfile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Candidate profile not found. Please complete your profile first.'
      });
    }

    // Check if job exists and is active
    const { data: job, error: jobError } = await userSupabase
      .from('jobs')
      .select('id, status')
      .eq('id', jobId)
      .single();

    console.log('Job lookup:', { job, jobError });

    if (jobError || !job) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Job not found'
      });
    }

    if (job.status !== 'active') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'This job is not accepting applications'
      });
    }

    // Check if already applied
    const { data: existingApplication } = await userSupabase
      .from('job_applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('candidate_id', candidateProfile.id)
      .single();

    if (existingApplication) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'You have already applied for this job'
      });
    }

    // Submit application using user's JWT token for RLS
    const applicationData = {
      job_id: jobId,
      candidate_id: candidateProfile.id,
      cover_letter: coverLetter,
      resume_url: resumeUrl
    };

    console.log('Submitting application with data:', applicationData);

    const { data: application, error: applicationError } = await userSupabase
      .from('job_applications')
      .insert(applicationData)
      .select()
      .single();

    console.log('Application submission result:', { application, applicationError });

    if (applicationError) {
      console.error('Application submission error:', applicationError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to submit application'
      });
    }

    // Trigger automatic AI analysis in the background (don't wait for it)
    // This runs asynchronously and won't block the response
    setImmediate(async () => {
      try {
        console.log(`🤖 Starting automatic AI analysis for application ${application.id}`);

        // Get full candidate and job data for analysis
        const { data: fullApplication } = await supabaseAdmin
          .from('job_applications')
          .select(`
            id,
            job_id,
            candidate_id,
            candidate:candidate_profiles(
              id,
              bio,
              headline,
              years_of_experience,
              current_job_title,
              current_company,
              skills:candidate_skills(skill_name, skill_level),
              experience:candidate_experience(
                job_title,
                company,
                description,
                start_date,
                end_date,
                is_current
              ),
              education:candidate_education(
                degree,
                field_of_study,
                institution,
                start_date,
                end_date
              )
            ),
            job:jobs(
              id,
              job_title,
              description,
              requirements,
              responsibilities,
              required_skills,
              preferred_skills,
              experience_level,
              education_level
            )
          `)
          .eq('id', application.id)
          .single();

        if (fullApplication && fullApplication.candidate && fullApplication.job) {
          const analysis = await AIAnalysisService.analyzeCandidateCompatibility(
            fullApplication.candidate,
            fullApplication.job
          );

          // Save analysis to database
          await supabaseAdmin
            .from('job_applications')
            .update({
              ai_analysis_score: analysis.compatibility_score,
              ai_analysis_data: analysis,
              ai_analyzed_at: new Date().toISOString()
            })
            .eq('id', application.id);

          console.log(`✅ Automatic AI analysis completed for application ${application.id}: ${analysis.compatibility_score}%`);
        }
      } catch (analysisError) {
        console.error('Background AI analysis error:', analysisError);
        // Don't fail the application submission if analysis fails
      }
    });

    res.status(201).json({
      message: 'Application submitted successfully',
      application
    });
  } catch (error) {
    console.error('Submit application error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to submit application',
      details: error.message
    });
  }
};

/**
 * Get all applications for a candidate
 */
const getCandidateApplications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;

    // Get candidate profile
    const { data: candidateProfile, error: candidateError } = await supabaseAdmin
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (candidateError || !candidateProfile) {
      // Profile not found - return empty list instead of error
      return res.json({
        applications: [],
        pagination: {
          total: 0,
          page: 1,
          limit: parseInt(limit),
          totalPages: 0
        }
      });
    }

    let query = supabaseAdmin
      .from('job_applications')
      .select(`
        *,
        jobs!inner(
          id,
          job_title,
          job_type,
          work_mode,
          country,
          city,
          recruiter_id,
          recruiter_profiles!inner(
            company_name,
            company_logo_url
          )
        )
      `, { count: 'exact' })
      .eq('candidate_id', candidateProfile.id)
      .order('applied_at', { ascending: false });

    // Filter by status
    if (status && ['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'].includes(status)) {
      query = query.eq('status', status);
    }

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: applications, error: applicationsError, count } = await query;

    if (applicationsError) {
      console.error('Get candidate applications error:', applicationsError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch applications'
      });
    }

    res.json({
      applications: applications || [],
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get candidate applications error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch applications'
    });
  }
};

/**
 * Get specific application for a candidate
 */
const getCandidateApplicationById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { applicationId } = req.params;

    // Get candidate profile
    const { data: candidateProfile, error: candidateError } = await supabaseAdmin
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

    // Get application
    const { data: application, error: applicationError } = await supabaseAdmin
      .from('job_applications')
      .select(`
        *,
        jobs(
          *,
          recruiter_profiles(
            company_name,
            company_logo_url,
            company_website
          )
        )
      `)
      .eq('id', applicationId)
      .eq('candidate_id', candidateProfile.id)
      .single();

    if (applicationError || !application) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Application not found'
      });
    }

    res.json({
      application
    });
  } catch (error) {
    console.error('Get candidate application error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch application'
    });
  }
};

/**
 * Withdraw a job application
 */
const withdrawApplication = async (req, res) => {
  try {
    const userId = req.user.id;
    const { applicationId } = req.params;

    // Get candidate profile
    const { data: candidateProfile, error: candidateError } = await supabaseAdmin
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

    // Delete application
    const { error: deleteError } = await supabaseAdmin
      .from('job_applications')
      .delete()
      .eq('id', applicationId)
      .eq('candidate_id', candidateProfile.id);

    if (deleteError) {
      console.error('Withdraw application error:', deleteError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to withdraw application'
      });
    }

    res.json({
      message: 'Application withdrawn successfully'
    });
  } catch (error) {
    console.error('Withdraw application error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to withdraw application'
    });
  }
};

/**
 * Get all applications for a job
 */
const getJobApplications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { jobId } = req.params;
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

    // Get recruiter profile
    const { data: recruiterProfile, error: recruiterError } = await userSupabase
      .from('recruiter_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (recruiterError || !recruiterProfile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Recruiter profile not found'
      });
    }

    // Verify job ownership
    const { data: job, error: jobError } = await userSupabase
      .from('jobs')
      .select('id')
      .eq('id', jobId)
      .eq('recruiter_id', recruiterProfile.id)
      .single();

    console.log('DEBUG: Job ownership check:', {
      jobId,
      recruiterId: recruiterProfile.id,
      userId,
      jobFound: !!job,
      error: jobError
    });

    if (jobError || !job) {
      console.error('DEBUG: Job ownership check failed:', jobError);
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to view applications for this job'
      });
    }

    // First, let's check if there are any applications for this job at all
    const { data: rawApplications, error: rawError } = await userSupabase
      .from('job_applications')
      .select('id, status, candidate_id')
      .eq('job_id', jobId);

    console.log('DEBUG: Raw applications query:', {
      count: rawApplications?.length,
      firstApp: rawApplications?.[0],
      error: rawError
    });

    let query = userSupabase
      .from('job_applications')
      .select(`
        *,
        ai_analysis_score,
        ai_analysis_data,
        ai_analyzed_at,
        candidate_profiles!inner(
          id,
          user_id,
          headline,
          current_job_title,
          current_company,
          years_of_experience,
          country,
          city,
          profiles!inner(
            full_name,
            email,
            profile_picture_url
          )
        )
      `, { count: 'exact' })
      .eq('job_id', jobId)
      .order('applied_at', { ascending: false });

    // Filter by status
    if (status && ['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'].includes(status)) {
      query = query.eq('status', status);
    }

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: applications, error: applicationsError, count } = await query;

    console.log('DEBUG: Job applications query result:', {
      count,
      returnedApps: applications?.length,
      firstAppCandidate: applications?.[0]?.candidate_profiles,
      error: applicationsError
    });

    if (applicationsError) {
      console.error('Get job applications error:', applicationsError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch applications'
      });
    }

    res.json({
      applications: applications || [],
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get job applications error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch applications'
    });
  }
};

/**
 * Get specific application details
 */
const getApplicationById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { applicationId } = req.params;

    // Get recruiter profile
    const { data: recruiterProfile, error: recruiterError } = await supabase
      .from('recruiter_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (recruiterError || !recruiterProfile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Recruiter profile not found'
      });
    }

    // Get application with job and candidate details
    const { data: application, error: applicationError } = await supabase
      .from('job_applications')
      .select(`
        *,
        jobs!inner(
          id,
          job_title,
          recruiter_id
        ),
        candidate_profiles!inner(
          id,
          headline,
          bio,
          current_job_title,
          current_company,
          years_of_experience,
          country,
          city,
          portfolio_website,
          linkedin_url,
          github_url,
          behance_url,
          profiles!inner(
            full_name,
            email,
            profile_picture_url
          )
        )
      `)
      .eq('id', applicationId)
      .single();

    if (applicationError || !application) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Application not found'
      });
    }

    // Verify job ownership
    if (application.jobs.recruiter_id !== recruiterProfile.id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to view this application'
      });
    }

    // Get candidate skills
    const { data: skills } = await supabase
      .from('candidate_skills')
      .select('*')
      .eq('candidate_id', application.candidate_profiles.id);

    // Get candidate experience
    const { data: experience } = await supabase
      .from('candidate_experience')
      .select('*')
      .eq('candidate_id', application.candidate_profiles.id)
      .order('start_date', { ascending: false });

    // Get candidate education
    const { data: education } = await supabase
      .from('candidate_education')
      .select('*')
      .eq('candidate_id', application.candidate_profiles.id)
      .order('start_date', { ascending: false });

    // Get candidate certifications
    const { data: certifications } = await supabase
      .from('candidate_certifications')
      .select('*')
      .eq('candidate_id', application.candidate_profiles.id)
      .order('issue_date', { ascending: false });

    res.json({
      application: {
        ...application,
        candidate_details: {
          skills: skills || [],
          experience: experience || [],
          education: education || [],
          certifications: certifications || []
        }
      }
    });
  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch application'
    });
  }
};

/**
 * Update application status
 */
const updateApplicationStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { applicationId } = req.params;
    const { status } = req.body;

    console.log('Update application status request:', { userId, applicationId, status });

    if (!status || !['pending', 'reviewed', 'shortlisted', 'interview', 'rejected', 'hired'].includes(status)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid status. Must be one of: pending, reviewed, shortlisted, interview, rejected, hired'
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
    const { data: recruiterProfile, error: recruiterError } = await userSupabase
      .from('recruiter_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (recruiterError || !recruiterProfile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Recruiter profile not found'
      });
    }

    // Get application with job and candidate details
    const { data: application, error: applicationError } = await userSupabase
      .from('job_applications')
      .select(`
        id,
        candidate_id,
        job_id,
        jobs!inner(
          id,
          recruiter_id
        )
      `)
      .eq('id', applicationId)
      .single();

    console.log('Application lookup:', { application, applicationError });

    if (applicationError || !application) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Application not found'
      });
    }

    // Verify job ownership
    if (application.jobs.recruiter_id !== recruiterProfile.id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to update this application'
      });
    }

    // Update application status
    const updateData = {
      status,
      reviewed_at: new Date().toISOString()
    };

    console.log('Updating application with data:', updateData);

    const { data: updatedApplication, error: updateError } = await userSupabase
      .from('job_applications')
      .update(updateData)
      .eq('id', applicationId)
      .select()
      .single();

    console.log('Update result:', { updatedApplication, updateError });

    if (updateError) {
      console.error('Update application status error:', updateError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update application status'
      });
    }

    // AUTOMATICALLY CREATE CONVERSATION if status is shortlisted, interview, or hired
    if (['shortlisted', 'interview', 'hired'].includes(status)) {
      try {
        console.log('Checking for existing conversation...');

        // Check if conversation already exists
        const { data: existingConversation } = await userSupabase
          .from('conversations')
          .select('id')
          .eq('application_id', applicationId)
          .single();

        if (!existingConversation) {
          console.log('Creating new conversation for application:', applicationId);

          const conversationData = {
            recruiter_id: recruiterProfile.id,
            candidate_id: application.candidate_id,
            job_id: application.job_id,
            application_id: applicationId,
            is_initiated: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { error: conversationError } = await userSupabase
            .from('conversations')
            .insert(conversationData);

          if (conversationError) {
            console.error('Failed to auto-create conversation:', conversationError);
            // Don't fail the request, just log it
          } else {
            console.log('✅ Conversation auto-created successfully');
          }
        } else {
          console.log('Conversation already exists:', existingConversation.id);
        }
      } catch (convError) {
        console.error('Error in conversation auto-creation:', convError);
      }
    }

    res.json({
      message: 'Application status updated successfully',
      application: updatedApplication
    });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update application status'
    });
  }
};

module.exports = {
  submitApplication,
  getCandidateApplications,
  getCandidateApplicationById,
  withdrawApplication,
  getJobApplications,
  getApplicationById,
  updateApplicationStatus
};
