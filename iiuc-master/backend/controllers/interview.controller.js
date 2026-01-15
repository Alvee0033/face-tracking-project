const { supabase, supabaseAdmin } = require('../config/supabase');
const { createClient } = require('@supabase/supabase-js');

/**
 * Get all jobs with selected candidates (shortlisted/interview_scheduled) for recruiter
 */
const getRecruiterInterviews = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('=== GET RECRUITER INTERVIEWS ===');
    console.log('User ID:', userId);

    // Get recruiter profile
    const { data: recruiterProfile, error: recruiterError } = await supabaseAdmin
      .from('recruiter_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (recruiterError || !recruiterProfile) {
      console.error('Recruiter profile error:', recruiterError);
      return res.status(404).json({
        error: 'Not Found',
        message: 'Recruiter profile not found'
      });
    }

    console.log('Recruiter Profile ID:', recruiterProfile.id);

    // Get all jobs for this recruiter
    const { data: jobs, error: jobsError } = await supabaseAdmin
      .from('jobs')
      .select(`
        id,
        job_title,
        department,
        job_type,
        work_mode,
        city,
        country,
        status,
        created_at
      `)
      .eq('recruiter_id', recruiterProfile.id)
      .order('created_at', { ascending: false });

    if (jobsError) {
      console.error('Get jobs error:', jobsError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch jobs'
      });
    }

    console.log(`Found ${jobs?.length || 0} jobs for recruiter`);

    // Get applications for each job that are shortlisted or interview_scheduled
    const jobsWithApplications = await Promise.all(
      jobs.map(async (job) => {
        console.log(`\nChecking job: ${job.job_title} (${job.id})`);

        const { data: applications, error: appsError } = await supabaseAdmin
          .from('job_applications')
          .select(`
            id,
            status,
            applied_at,
            reviewed_at,
            ai_analysis_score,
            ai_analysis_data,
            ai_analyzed_at,
            candidate:candidate_profiles(
              id,
              user_id,
              headline,
              current_job_title,
              current_company,
              city,
              country,
              bio,
              profile:profiles!candidate_profiles_user_id_fkey(
                full_name,
                email,
                phone_number,
                profile_picture_url
              )
            ),
            conversation:conversations(
              id,
              is_initiated,
              last_message_at,
              last_message_content,
              recruiter_unread_count,
              candidate_unread_count
            )
          `)
          .eq('job_id', job.id)
          .eq('status', 'shortlisted');

        // Log all applications for this job first
        const { data: allApps } = await supabaseAdmin
          .from('job_applications')
          .select('id, status')
          .eq('job_id', job.id);

        console.log(`  - All applications for this job:`, allApps?.map(a => `${a.id.substring(0, 8)}... (${a.status})`).join(', ') || 'none');

        if (appsError) {
          console.error('Error fetching applications for job:', job.id, appsError);
        }

        console.log(`  - Applications with shortlisted/interview_scheduled status: ${applications?.length || 0}`);

        if (applications && applications.length > 0) {
          console.log('  - Application statuses:', applications.map(a => a.status).join(', '));
          console.log('  - Application IDs:', applications.map(a => a.id).join(', '));
        }

        return {
          ...job,
          job_applications: applications || []
        };
      })
    );

    // Transform data to group applications by job
    const interviewJobs = jobsWithApplications
      .filter(job => job.job_applications.length > 0) // Only include jobs with selected candidates
      .map(job => ({
        id: job.id,
        job_title: job.job_title,
        department: job.department,
        job_type: job.job_type,
        work_mode: job.work_mode,
        location: `${job.city}, ${job.country}`,
        status: job.status,
        created_at: job.created_at,
        selected_candidates: job.job_applications
      }));

    console.log(`\n=== FINAL RESULT ===`);
    console.log(`Jobs with shortlisted candidates: ${interviewJobs.length}`);
    console.log('Job IDs:', interviewJobs.map(j => j.id).join(', '));
    console.log('Total candidates:', interviewJobs.reduce((sum, job) => sum + job.selected_candidates.length, 0));

    res.status(200).json({
      jobs: interviewJobs,
      total: interviewJobs.length
    });
  } catch (error) {
    console.error('Get recruiter interviews error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch interviews'
    });
  }
};

/**
 * Get selected candidates for a specific job
 */
const getJobInterviewCandidates = async (req, res) => {
  try {
    const userId = req.user.id;
    const { jobId } = req.params;

    // Get recruiter profile
    const { data: recruiterProfile, error: recruiterError } = await supabaseAdmin
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

    // Verify job belongs to recruiter
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('id, job_title')
      .eq('id', jobId)
      .eq('recruiter_id', recruiterProfile.id)
      .single();

    if (jobError || !job) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Job not found'
      });
    }

    // Get selected candidates for this job
    const { data: applications, error: applicationsError } = await supabaseAdmin
      .from('job_applications')
      .select(`
        id,
        status,
        applied_at,
        reviewed_at,
        ai_analysis_score,
        ai_analysis_data,
        ai_analyzed_at,
        candidate:candidate_profiles(
          id,
          user_id,
          headline,
          current_job_title,
          current_company,
          city,
          country,
          bio,
          years_of_experience,
          profile:profiles!candidate_profiles_user_id_fkey(
            full_name,
            email,
            phone_number,
            profile_picture_url
          ),
          skills:candidate_skills(
            skill_name,
            skill_level
          ),
          experience:candidate_experience(
            job_title,
            company,
            start_date,
            end_date,
            is_current
          ),
          education:candidate_education(
            degree,
            field_of_study,
            institution,
            start_date,
            end_date,
            is_current
          )
        ),
        conversation:conversations(
          id,
          is_initiated,
          last_message_at,
          last_message_content,
          recruiter_unread_count,
          candidate_unread_count
        )
      `)
      .eq('job_id', jobId)
      .eq('status', 'shortlisted')
      .order('reviewed_at', { ascending: false });

    if (applicationsError) {
      console.error('Get candidates error:', applicationsError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch candidates'
      });
    }

    res.status(200).json({
      job: {
        id: job.id,
        title: job.job_title
      },
      candidates: applications || [],
      total: applications?.length || 0
    });
  } catch (error) {
    console.error('Get job interview candidates error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch candidates'
    });
  }
};

/**
 * Update application status (e.g., shortlist, schedule interview)
 */
const updateApplicationStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { applicationId } = req.params;
    const { status } = req.body;

    // Get the user's JWT token
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;

    // Create a Supabase client with the user's JWT token
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
    const { data: recruiterProfile, error: recruiterError } = await supabaseAdmin
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

    // Get application and verify it belongs to recruiter's job
    const { data: application, error: applicationError } = await supabaseAdmin
      .from('job_applications')
      .select(`
        id,
        job_id,
        candidate_id,
        jobs!inner(
          recruiter_id
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

    if (application.jobs.recruiter_id !== recruiterProfile.id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to update this application'
      });
    }

    // Update application status using user's JWT token for RLS
    const updateData = {
      status,
      reviewed_at: new Date().toISOString()
    };

    const { data: updatedApplication, error: updateError } = await userSupabase
      .from('job_applications')
      .update(updateData)
      .eq('id', applicationId)
      .select()
      .single();

    if (updateError) {
      console.error('Update application error:', updateError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update application status'
      });
    }

    res.status(200).json({
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

/**
 * Get or create conversation for an application
 */
const getOrCreateConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { applicationId } = req.params;

    // Get the user's JWT token
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;

    // Create a Supabase client with the user's JWT token
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
    const { data: recruiterProfile, error: recruiterError } = await supabaseAdmin
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

    // Get application details
    const { data: application, error: applicationError } = await supabaseAdmin
      .from('job_applications')
      .select(`
        id,
        job_id,
        candidate_id,
        jobs!inner(
          recruiter_id
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

    if (application.jobs.recruiter_id !== recruiterProfile.id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this conversation'
      });
    }

    // Check if conversation already exists
    const { data: existingConversation, error: conversationCheckError } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('application_id', applicationId)
      .single();

    if (existingConversation) {
      return res.status(200).json({
        conversation: existingConversation
      });
    }

    // Create new conversation using user's JWT token for RLS
    const conversationData = {
      application_id: applicationId,
      recruiter_id: recruiterProfile.id,
      candidate_id: application.candidate_id,
      job_id: application.job_id,
      is_initiated: false,
      initiated_by_recruiter: false
    };

    const { data: newConversation, error: createError } = await userSupabase
      .from('conversations')
      .insert(conversationData)
      .select()
      .single();

    if (createError) {
      console.error('Create conversation error:', createError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create conversation'
      });
    }

    res.status(201).json({
      conversation: newConversation
    });
  } catch (error) {
    console.error('Get or create conversation error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get or create conversation'
    });
  }
};

/**
 * Get all jobs with candidates for inbox (shortlisted, interview, hired)
 */
const getRecruiterInboxCandidates = async (req, res) => {
  console.log('HIT getRecruiterInboxCandidates');
  try {
    const userId = req.user.id;

    // Get recruiter profile
    const { data: recruiterProfile, error: recruiterError } = await supabaseAdmin
      .from('recruiter_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (recruiterError || !recruiterProfile) {
      return res.status(404).json({ error: 'Not Found', message: 'Recruiter profile not found' });
    }

    // Get all jobs for this recruiter
    const { data: jobs, error: jobsError } = await supabaseAdmin
      .from('jobs')
      .select(`
        id,
        job_title,
        department,
        job_type,
        work_mode,
        city,
        country,
        status,
        created_at
      `)
      .eq('recruiter_id', recruiterProfile.id)
      .order('created_at', { ascending: false });

    if (jobsError) {
      console.error('Get jobs error:', jobsError);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch jobs' });
    }

    // Get applications for each job
    const jobsWithApplications = await Promise.all(
      jobs.map(async (job) => {
        const { data: applications, error: appsError } = await supabaseAdmin
          .from('job_applications')
          .select(`
            id,
            status,
            applied_at,
            reviewed_at,
            ai_analysis_score,
            ai_analysis_data,
            ai_analyzed_at,
            candidate:candidate_profiles(
              id,
              user_id,
              headline,
              current_job_title,
              current_company,
              city,
              country,
              bio,
              profile:profiles!candidate_profiles_user_id_fkey(
                full_name,
                email,
                phone_number,
                profile_picture_url
              )
            ),
            conversation:conversations(
              id,
              is_initiated,
              last_message_at,
              last_message_content,
              recruiter_unread_count,
              candidate_unread_count
            )
          `)
          .eq('job_id', job.id)
          .in('status', ['shortlisted', 'interview', 'hired']);

        if (appsError) console.error('Error fetching applications for job:', job.id, appsError);

        return {
          ...job,
          job_applications: applications || []
        };
      })
    );

    // Transform data
    const interviewJobs = jobsWithApplications
      .filter(job => job.job_applications.length > 0)
      .map(job => ({
        id: job.id,
        job_title: job.job_title,
        department: job.department,
        job_type: job.job_type,
        work_mode: job.work_mode,
        location: `${job.city}, ${job.country}`,
        status: job.status,
        created_at: job.created_at,
        selected_candidates: job.job_applications
      }));

    res.status(200).json({
      jobs: interviewJobs,
      total: interviewJobs.length
    });
  } catch (error) {
    console.error('Get recruiter inbox candidates error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch inbox candidates' });
  }
};

module.exports = {
  getRecruiterInterviews,
  getJobInterviewCandidates,
  updateApplicationStatus,
  getOrCreateConversation,
  getRecruiterInboxCandidates
};
