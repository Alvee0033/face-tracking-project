const { supabase, supabaseAdmin } = require('../config/supabase');
const { createClient } = require('@supabase/supabase-js');
const groqTranscription = require('../services/groqTranscription.service');
const aiQuestionGenerator = require('../services/aiQuestionGenerator.service');
const multer = require('multer');
const path = require('path');

// ============================================
// RECRUITER ENDPOINTS
// ============================================

/**
 * Create interview template
 * POST /api/interviews/templates
 */
const createTemplate = async (req, res) => {
    try {
        const userId = req.user.id;
        const { title, description, topic, is_ai_generated, duration_minutes, questions } = req.body;

        console.log('=== CREATE INTERVIEW TEMPLATE ===');
        console.log('User ID:', userId);
        console.log('Template data:', { title, topic, is_ai_generated, duration_minutes });

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

        // Get user's JWT token for RLS
        const authHeader = req.headers.authorization;
        const token = authHeader ? authHeader.replace('Bearer ', '') : null;
        const userSupabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY,
            { global: { headers: { Authorization: `Bearer ${token}` } } }
        );

        // Create template
        const { data: template, error: templateError } = await userSupabase
            .from('interview_templates')
            .insert({
                recruiter_id: recruiterProfile.id,
                title,
                description,
                topic,
                is_ai_generated: is_ai_generated || false,
                duration_minutes: duration_minutes || 30
            })
            .select()
            .single();

        if (templateError) {
            console.error('Template creation error:', templateError);
            return res.status(500).json({
                error: 'Internal Server Error',
                message: 'Failed to create template'
            });
        }

        // Add questions if provided
        if (questions && questions.length > 0) {
            const questionsData = questions.map((q, index) => ({
                template_id: template.id,
                question_text: q.question_text,
                question_type: q.question_type || 'general',
                order_index: q.order_index !== undefined ? q.order_index : index,
                expected_duration_seconds: q.expected_duration_seconds || 120
            }));

            const { error: questionsError } = await userSupabase
                .from('interview_questions')
                .insert(questionsData);

            if (questionsError) {
                console.error('Questions creation error:', questionsError);
                // Don't fail the whole request, template is already created
            }
        }

        console.log('✅ Template created:', template.id);

        res.status(201).json({
            message: 'Interview template created successfully',
            template
        });
    } catch (error) {
        console.error('Create template error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to create interview template'
        });
    }
};

/**
 * Get all templates for recruiter
 * GET /api/interviews/templates
 */
const getTemplates = async (req, res) => {
    try {
        const userId = req.user.id;

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

        // Get templates with questions
        const { data: templates, error: templatesError } = await supabaseAdmin
            .from('interview_templates')
            .select(`
        *,
        questions:interview_questions(*)
      `)
            .eq('recruiter_id', recruiterProfile.id)
            .order('created_at', { ascending: false });

        if (templatesError) {
            console.error('Get templates error:', templatesError);
            return res.status(500).json({
                error: 'Internal Server Error',
                message: 'Failed to fetch templates'
            });
        }

        res.status(200).json({
            templates: templates || [],
            total: templates?.length || 0
        });
    } catch (error) {
        console.error('Get templates error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch templates'
        });
    }
};

/**
 * Get specific template
 * GET /api/interviews/templates/:id
 */
const getTemplateById = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

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

        // Get template with questions
        const { data: template, error: templateError } = await supabaseAdmin
            .from('interview_templates')
            .select(`
        *,
        questions:interview_questions(*)
      `)
            .eq('id', id)
            .eq('recruiter_id', recruiterProfile.id)
            .single();

        if (templateError || !template) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Template not found'
            });
        }

        res.status(200).json({ template });
    } catch (error) {
        console.error('Get template error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch template'
        });
    }
};

/**
 * Update template
 * PUT /api/interviews/templates/:id
 */
const updateTemplate = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { title, description, topic, duration_minutes } = req.body;

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

        // Get user's JWT token for RLS
        const authHeader = req.headers.authorization;
        const token = authHeader ? authHeader.replace('Bearer ', '') : null;
        const userSupabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY,
            { global: { headers: { Authorization: `Bearer ${token}` } } }
        );

        // Update template
        const { data: template, error: updateError } = await userSupabase
            .from('interview_templates')
            .update({
                title,
                description,
                topic,
                duration_minutes,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('recruiter_id', recruiterProfile.id)
            .select()
            .single();

        if (updateError || !template) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Template not found or update failed'
            });
        }

        res.status(200).json({
            message: 'Template updated successfully',
            template
        });
    } catch (error) {
        console.error('Update template error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to update template'
        });
    }
};

/**
 * Delete template
 * DELETE /api/interviews/templates/:id
 */
const deleteTemplate = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

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

        // Get user's JWT token for RLS
        const authHeader = req.headers.authorization;
        const token = authHeader ? authHeader.replace('Bearer ', '') : null;
        const userSupabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY,
            { global: { headers: { Authorization: `Bearer ${token}` } } }
        );

        // Delete template (cascade will delete questions)
        const { error: deleteError } = await userSupabase
            .from('interview_templates')
            .delete()
            .eq('id', id)
            .eq('recruiter_id', recruiterProfile.id);

        if (deleteError) {
            console.error('Delete template error:', deleteError);
            return res.status(500).json({
                error: 'Internal Server Error',
                message: 'Failed to delete template'
            });
        }

        res.status(200).json({
            message: 'Template deleted successfully'
        });
    } catch (error) {
        console.error('Delete template error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to delete template'
        });
    }
};

/**
 * Generate AI questions for template
 * POST /api/interviews/templates/:id/generate-questions
 */
const generateQuestions = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { questionCount = 10, jobId } = req.body;

        console.log('=== GENERATE AI QUESTIONS ===');
        console.log('Template ID:', id);
        console.log('Question count:', questionCount);

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

        // Get template
        const { data: template, error: templateError } = await supabaseAdmin
            .from('interview_templates')
            .select('*')
            .eq('id', id)
            .eq('recruiter_id', recruiterProfile.id)
            .single();

        if (templateError || !template) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Template not found'
            });
        }

        // Get job details if jobId provided
        let jobDetails = {};
        if (jobId) {
            const { data: job } = await supabaseAdmin
                .from('jobs')
                .select('job_title, job_description, qualifications, responsibilities')
                .eq('id', jobId)
                .eq('recruiter_id', recruiterProfile.id)
                .single();

            if (job) {
                jobDetails = {
                    job_title: job.job_title,
                    job_description: job.job_description,
                    required_skills: job.qualifications
                };
            }
        }

        // Generate questions using AI
        const questions = await aiQuestionGenerator.generateInterviewQuestions(
            template.topic || template.title,
            jobDetails,
            questionCount
        );

        // Get user's JWT token for RLS
        const authHeader = req.headers.authorization;
        const token = authHeader ? authHeader.replace('Bearer ', '') : null;
        const userSupabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY,
            { global: { headers: { Authorization: `Bearer ${token}` } } }
        );

        // Save questions to database
        const questionsData = questions.map(q => ({
            template_id: id,
            ...q
        }));

        const { data: savedQuestions, error: saveError } = await userSupabase
            .from('interview_questions')
            .insert(questionsData)
            .select();

        if (saveError) {
            console.error('Save questions error:', saveError);
            return res.status(500).json({
                error: 'Internal Server Error',
                message: 'Failed to save generated questions'
            });
        }

        console.log(`✅ Generated and saved ${savedQuestions.length} questions`);

        res.status(201).json({
            message: 'Questions generated successfully',
            questions: savedQuestions
        });
    } catch (error) {
        console.error('Generate questions error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to generate questions',
            details: error.message
        });
    }
};

/**
 * Assign interview to application
 * POST /api/interviews/assign
 */
const assignInterview = async (req, res) => {
    try {
        const userId = req.user.id;
        const { templateId, applicationId } = req.body;

        console.log('=== ASSIGN INTERVIEW ===');
        console.log('Template ID:', templateId);
        console.log('Application ID:', applicationId);

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

        // Verify template ownership
        const { data: template, error: templateError } = await supabaseAdmin
            .from('interview_templates')
            .select('id')
            .eq('id', templateId)
            .eq('recruiter_id', recruiterProfile.id)
            .single();

        if (templateError || !template) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Template not found'
            });
        }

        // Get application details
        const { data: application, error: appError } = await supabaseAdmin
            .from('job_applications')
            .select(`
        id,
        candidate_id,
        job_id,
        jobs!inner(recruiter_id)
      `)
            .eq('id', applicationId)
            .single();

        if (appError || !application) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Application not found'
            });
        }

        // Verify job ownership
        if (application.jobs.recruiter_id !== recruiterProfile.id) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'You do not have permission to assign interview to this application'
            });
        }

        // Get user's JWT token for RLS
        const authHeader = req.headers.authorization;
        const token = authHeader ? authHeader.replace('Bearer ', '') : null;
        const userSupabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY,
            { global: { headers: { Authorization: `Bearer ${token}` } } }
        );

        // Create interview session
        const { data: session, error: sessionError } = await supabaseAdmin
            .from('interview_sessions')
            .insert({
                application_id: applicationId,
                template_id: templateId,
                candidate_id: application.candidate_id,
                job_id: application.job_id,
                status: 'not_started'
            })
            .select()
            .single();

        if (sessionError) {
            console.error('Session creation error:', sessionError);
            return res.status(500).json({
                error: 'Internal Server Error',
                message: 'Failed to create interview session'
            });
        }

        // Update application status to interview_assigned
        const { error: updateError } = await userSupabase
            .from('job_applications')
            .update({ status: 'interview_assigned' })
            .eq('id', applicationId);

        if (updateError) {
            console.error('Application status update error:', updateError);
        }

        console.log('✅ Interview assigned:', session.id);

        res.status(201).json({
            message: 'Interview assigned successfully',
            session
        });
    } catch (error) {
        console.error('Assign interview error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to assign interview'
        });
    }
};

const pdf = require('pdf-parse');

/**
 * Quick Assign AI Interview (from Topic or File)
 * POST /api/interviews/assign-quick
 */
const assignQuickInterview = async (req, res) => {
    try {
        const userId = req.user.id;
        const { candidateId, jobId, topic, questionCount = 5 } = req.body;
        const file = req.file;

        console.log('=== QUICK ASSIGN INTERVIEW ===');
        console.log('Candidate:', candidateId);
        console.log('Job:', jobId);

        // 1. Get Recruiter Profile
        const { data: recruiterProfile, error: recruiterError } = await supabaseAdmin
            .from('recruiter_profiles')
            .select('id')
            .eq('user_id', userId)
            .single();

        if (recruiterError || !recruiterProfile) {
            return res.status(404).json({ error: 'Not Found', message: 'Recruiter profile not found' });
        }

        // 2. Extract Context (Text from File or Topic)
        let contextText = topic || "";

        if (file) {
            try {
                if (file.mimetype === 'application/pdf') {
                    const data = await pdf(file.buffer);
                    contextText = data.text.substring(0, 3000); // Limit context size
                    console.log("📄 Extracted text from PDF, length:", contextText.length);
                } else {
                    // Assume text file
                    contextText = file.buffer.toString('utf-8').substring(0, 3000);
                }
            } catch (err) {
                console.error("File parsing error:", err);
                return res.status(400).json({ error: 'Bad Request', message: 'Failed to parse uploaded file' });
            }
        }

        if (!contextText) {
            return res.status(400).json({ error: 'Bad Request', message: 'Either topic or file is required' });
        }

        // 3. Create a Hidden/Auto Template
        // We use a specific naming convention or flag to mark these as ad-hoc
        const templateTitle = `Quick Interview: ${topic || 'Custom Assignment'} - ${new Date().toLocaleDateString()}`;

        const { data: template, error: templateError } = await supabaseAdmin
            .from('interview_templates')
            .insert({
                recruiter_id: recruiterProfile.id,
                title: templateTitle,
                description: `Auto-generated from ${file ? 'file upload' : 'topic'}: ${contextText.substring(0, 50)}...`,
                topic: topic || "Custom",
                is_ai_generated: true,
                duration_minutes: 15
            })
            .select()
            .single();

        if (templateError) {
            throw templateError;
        }

        // 4. Generate Questions using AI
        // We reuse the existing service but pass our context as the "topic" effectively
        const questions = await aiQuestionGenerator.generateInterviewQuestions(
            contextText,
            { job_title: "Custom Assignment" },
            Number(questionCount)
        );

        // 5. Save Questions
        const questionsData = questions.map((q, index) => ({
            template_id: template.id,
            question_text: q.question_text,
            question_type: q.question_type || 'general',
            order_index: index,
            expected_duration_seconds: q.expected_duration_seconds || 120
        }));

        await supabaseAdmin.from('interview_questions').insert(questionsData);

        // 6. Assign to Candidate (Create Session)
        // We need the application ID ideally, or we can just link candidate + job
        // The previous "assign" required valid application ID. 
        // Let's find the application for this candidate & job.
        const { data: application } = await supabaseAdmin
            .from('job_applications')
            .select('id')
            .eq('candidate_id', candidateId)
            .eq('job_id', jobId)
            .single();

        if (!application) {
            return res.status(404).json({ error: 'Not Found', message: 'Candidate does not have an active application for this job' });
        }

        const { data: session, error: sessionError } = await supabaseAdmin
            .from('interview_sessions')
            .insert({
                application_id: application.id,
                template_id: template.id,
                candidate_id: candidateId,
                job_id: jobId,
                status: 'not_started'
            })
            .select()
            .single();

        if (sessionError) throw sessionError;

        // Update application status
        await supabaseAdmin
            .from('job_applications')
            .update({ status: 'interview_assigned' })
            .eq('id', application.id);

        res.status(201).json({
            success: true,
            message: 'AI Interview assigned successfully',
            session
        });

    } catch (error) {
        console.error('Assign Quick Interview error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message || 'Failed to assign interview'
        });
    }
};

/**
 * Get interview results
 * GET /api/interviews/sessions/:sessionId/results
 */
const getInterviewResults = async (req, res) => {
    try {
        const userId = req.user.id;
        const { sessionId } = req.params;

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

        // Get session with all related data
        const { data: session, error: sessionError } = await supabaseAdmin
            .from('interview_sessions')
            .select(`
        *,
        template:interview_templates(*),
        application:job_applications(
          *,
          candidate:candidate_profiles(
            *,
            profile:profiles!candidate_profiles_user_id_fkey(*)
          ),
          job:jobs(*)
        ),
        responses:interview_responses(
          *,
          question:interview_questions(*)
        ),
        attention_data:attention_tracking_data(*)
      `)
            .eq('id', sessionId)
            .single();

        if (sessionError || !session) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Interview session not found'
            });
        }

        // Verify ownership
        if (session.application.job.recruiter_id !== recruiterProfile.id) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'You do not have permission to view this interview'
            });
        }

        // Calculate attention metrics
        const attentionMetrics = calculateAttentionMetrics(session.attention_data || []);

        res.status(200).json({
            session,
            attentionMetrics
        });
    } catch (error) {
        console.error('Get interview results error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch interview results'
        });
    }
};

// ============================================
// CANDIDATE ENDPOINTS
// ============================================

/**
 * Get candidate's assigned interviews
 * GET /api/interviews/my-interviews
 */
const getMyInterviews = async (req, res) => {
    try {
        const userId = req.user.id;

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

        // Get interview sessions
        const { data: sessions, error: sessionsError } = await supabaseAdmin
            .from('interview_sessions')
            .select(`
        *,
        template:interview_templates(*),
        application:job_applications(
          *,
          job:jobs(
            *,
            recruiter:recruiter_profiles(
              company_name,
              company_logo_url
            )
          )
        )
      `)
            .eq('candidate_id', candidateProfile.id)
            .order('created_at', { ascending: false });

        if (sessionsError) {
            console.error('Get sessions error:', sessionsError);
            return res.status(500).json({
                error: 'Internal Server Error',
                message: 'Failed to fetch interviews'
            });
        }

        res.status(200).json({
            interviews: sessions || [],
            total: sessions?.length || 0
        });
    } catch (error) {
        console.error('Get my interviews error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch interviews'
        });
    }
};

/**
 * Start interview session
 * POST /api/interviews/sessions/:sessionId/start
 */
const startInterview = async (req, res) => {
    try {
        const userId = req.user.id;
        const { sessionId } = req.params;

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

        // Get user's JWT token for RLS
        const authHeader = req.headers.authorization;
        const token = authHeader ? authHeader.replace('Bearer ', '') : null;
        const userSupabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY,
            { global: { headers: { Authorization: `Bearer ${token}` } } }
        );

        // Update session status
        const { data: session, error: updateError } = await userSupabase
            .from('interview_sessions')
            .update({
                status: 'in_progress',
                started_at: new Date().toISOString()
            })
            .eq('id', sessionId)
            .eq('candidate_id', candidateProfile.id)
            .select(`
        *,
        template:interview_templates(*),
        questions:interview_templates(
          questions:interview_questions(*)
        )
      `)
            .single();

        if (updateError || !session) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Interview session not found or already started'
            });
        }

        res.status(200).json({
            message: 'Interview started successfully',
            session
        });
    } catch (error) {
        console.error('Start interview error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to start interview'
        });
    }
};

/**
 * Submit interview response
 * POST /api/interviews/sessions/:sessionId/responses
 */
const submitResponse = async (req, res) => {
    try {
        const userId = req.user.id;
        const { sessionId } = req.params;
        const { questionId, audioUrl, transcriptionText, responseDurationSeconds } = req.body;

        console.log('=== SUBMIT INTERVIEW RESPONSE ===');
        console.log('Session ID:', sessionId);
        console.log('Question ID:', questionId);

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

        // Verify session ownership
        const { data: session, error: sessionError } = await supabaseAdmin
            .from('interview_sessions')
            .select('id, candidate_id')
            .eq('id', sessionId)
            .eq('candidate_id', candidateProfile.id)
            .single();

        if (sessionError || !session) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Interview session not found'
            });
        }

        // Get user's JWT token for RLS
        const authHeader = req.headers.authorization;
        const token = authHeader ? authHeader.replace('Bearer ', '') : null;
        const userSupabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY,
            { global: { headers: { Authorization: `Bearer ${token}` } } }
        );

        // Save response
        const { data: response, error: responseError } = await userSupabase
            .from('interview_responses')
            .insert({
                session_id: sessionId,
                question_id: questionId,
                audio_url: audioUrl,
                transcription_text: transcriptionText,
                response_duration_seconds: responseDurationSeconds || 0
            })
            .select()
            .single();

        if (responseError) {
            console.error('Response save error:', responseError);
            return res.status(500).json({
                error: 'Internal Server Error',
                message: 'Failed to save response'
            });
        }

        console.log('✅ Response saved:', response.id);

        res.status(201).json({
            message: 'Response submitted successfully',
            response
        });
    } catch (error) {
        console.error('Submit response error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to submit response'
        });
    }
};

/**
 * Submit attention tracking data
 * POST /api/interviews/sessions/:sessionId/attention
 */
const submitAttentionData = async (req, res) => {
    try {
        const userId = req.user.id;
        const { sessionId } = req.params;
        const attentionData = req.body; // Array of attention data points

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

        // Verify session ownership
        const { data: session, error: sessionError } = await supabaseAdmin
            .from('interview_sessions')
            .select('id')
            .eq('id', sessionId)
            .eq('candidate_id', candidateProfile.id)
            .single();

        if (sessionError || !session) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Interview session not found'
            });
        }

        // Get user's JWT token for RLS
        const authHeader = req.headers.authorization;
        const token = authHeader ? authHeader.replace('Bearer ', '') : null;
        const userSupabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY,
            { global: { headers: { Authorization: `Bearer ${token}` } } }
        );

        // Prepare data for insertion
        const dataPoints = Array.isArray(attentionData) ? attentionData : [attentionData];
        const insertData = dataPoints.map(point => ({
            session_id: sessionId,
            is_focused: point.is_focused,
            face_detected: point.face_detected,
            gaze_direction: point.gaze_direction,
            head_pose: point.head_pose,
            window_blur_count: point.window_blur_count || 0,
            suspicious_activity_flags: point.suspicious_activity_flags || []
        }));

        // Save attention data
        const { error: saveError } = await userSupabase
            .from('attention_tracking_data')
            .insert(insertData);

        if (saveError) {
            console.error('Attention data save error:', saveError);
            return res.status(500).json({
                error: 'Internal Server Error',
                message: 'Failed to save attention data'
            });
        }

        res.status(201).json({
            message: 'Attention data saved successfully'
        });
    } catch (error) {
        console.error('Submit attention data error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to submit attention data'
        });
    }
};

/**
 * Complete interview session
 * POST /api/interviews/sessions/:sessionId/complete
 */
const completeInterview = async (req, res) => {
    try {
        const userId = req.user.id;
        const { sessionId } = req.params;

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

        // Get user's JWT token for RLS
        const authHeader = req.headers.authorization;
        const token = authHeader ? authHeader.replace('Bearer ', '') : null;
        const userSupabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY,
            { global: { headers: { Authorization: `Bearer ${token}` } } }
        );

        // Get session to calculate duration
        const { data: session, error: sessionError } = await supabaseAdmin
            .from('interview_sessions')
            .select('started_at, application_id')
            .eq('id', sessionId)
            .eq('candidate_id', candidateProfile.id)
            .single();

        if (sessionError || !session) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Interview session not found'
            });
        }

        const completedAt = new Date();
        const startedAt = new Date(session.started_at);
        const durationSeconds = Math.floor((completedAt - startedAt) / 1000);

        // Update session
        const { error: updateError } = await userSupabase
            .from('interview_sessions')
            .update({
                status: 'completed',
                completed_at: completedAt.toISOString(),
                total_duration_seconds: durationSeconds
            })
            .eq('id', sessionId)
            .eq('candidate_id', candidateProfile.id);

        if (updateError) {
            console.error('Complete interview error:', updateError);
            return res.status(500).json({
                error: 'Internal Server Error',
                message: 'Failed to complete interview'
            });
        }

        // Update application status
        const { error: appUpdateError } = await userSupabase
            .from('job_applications')
            .update({ status: 'interview_completed' })
            .eq('id', session.application_id);

        if (appUpdateError) {
            console.error('Application status update error:', appUpdateError);
        }

        res.status(200).json({
            message: 'Interview completed successfully',
            duration_seconds: durationSeconds
        });
    } catch (error) {
        console.error('Complete interview error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to complete interview'
        });
    }
};

/**
 * Transcribe audio file
 * POST /api/interviews/transcribe
 */
const transcribeAudio = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'No audio file provided'
            });
        }

        console.log('=== TRANSCRIBE AUDIO ===');
        console.log('File:', req.file.originalname);
        console.log('Size:', req.file.size);

        // Transcribe using Groq
        const transcription = await groqTranscription.transcribeAudio(
            req.file.buffer,
            req.file.originalname
        );

        res.status(200).json({
            transcription,
            filename: req.file.originalname
        });
    } catch (error) {
        console.error('Transcribe audio error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to transcribe audio',
            details: error.message
        });
    }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate attention metrics from tracking data
 */
function calculateAttentionMetrics(attentionData) {
    if (!attentionData || attentionData.length === 0) {
        return {
            total_data_points: 0,
            focus_percentage: 0,
            face_detection_percentage: 0,
            total_window_blurs: 0,
            suspicious_activities: []
        };
    }

    const totalPoints = attentionData.length;
    const focusedPoints = attentionData.filter(d => d.is_focused).length;
    const faceDetectedPoints = attentionData.filter(d => d.face_detected).length;
    const totalBlurs = attentionData.reduce((sum, d) => sum + (d.window_blur_count || 0), 0);

    const suspiciousActivities = [];
    attentionData.forEach(d => {
        if (d.suspicious_activity_flags && Array.isArray(d.suspicious_activity_flags)) {
            suspiciousActivities.push(...d.suspicious_activity_flags);
        }
    });

    return {
        total_data_points: totalPoints,
        focus_percentage: Math.round((focusedPoints / totalPoints) * 100),
        face_detection_percentage: Math.round((faceDetectedPoints / totalPoints) * 100),
        total_window_blurs: totalBlurs,
        suspicious_activities: suspiciousActivities,
        average_attention_score: Math.round(((focusedPoints + faceDetectedPoints) / (totalPoints * 2)) * 100)
    };
}

module.exports = {
    // Recruiter endpoints
    createTemplate,
    getTemplates,
    getTemplateById,
    updateTemplate,
    deleteTemplate,
    generateQuestions,
    assignInterview,
    assignQuickInterview,
    getInterviewResults,

    // Candidate endpoints
    getMyInterviews,
    startInterview,
    submitResponse,
    submitAttentionData,
    completeInterview,
    transcribeAudio
};
