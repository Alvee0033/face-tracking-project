const { supabase, supabaseAdmin } = require('../config/supabase');
const { createClient } = require('@supabase/supabase-js');
const WhisperService = require('../services/whisper.service');
const { Groq } = require('groq-sdk');

// Initialize Groq for AI operations
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * AI Interview Management Controllers - FIXED TABLE REFERENCES
 * Uses: candidate_profiles, recruiter_profiles (not candidates/recruiters)
 */

// ============================================
// RECRUITER: Schedule AI Interview
// ============================================
const scheduleInterview = async (req, res) => {
    try {
        const userId = req.user.id;
        const { job_id, candidate_id, scheduled_at, duration_minutes = 30 } = req.body;

        console.log('[AI Interview] Scheduling interview:', { job_id, candidate_id, scheduled_at });

        // Get recruiter profile
        const { data: recruiterProfile, error: recruiterError } = await supabaseAdmin
            .from('recruiter_profiles')
            .select('id')
            .eq('user_id', userId)
            .single();

        if (recruiterError || !recruiterProfile) {
            return res.status(404).json({ error: 'Recruiter profile not found' });
        }

        // Get user's JWT token for RLS
        const authHeader = req.headers.authorization;
        const token = authHeader ? authHeader.replace('Bearer ', '') : null;
        const userSupabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY,
            { global: { headers: { Authorization: `Bearer ${token}` } } }
        );

        // Create interview
        const { data: interview, error: interviewError } = await userSupabase
            .from('ai_interviews')
            .insert({
                job_id,
                candidate_id,
                recruiter_id: recruiterProfile.id,
                scheduled_at,
                duration_minutes,
                status: 'scheduled'
            })
            .select()
            .single();

        if (interviewError) {
            console.error('[AI Interview] Error creating interview:', interviewError);
            return res.status(500).json({ error: 'Failed to schedule interview', details: interviewError.message });
        }

        res.status(201).json({
            success: true,
            data: { interview }
        });

    } catch (error) {
        console.error('[AI Interview] Schedule error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================
// CANDIDATE: Get My Interviews
// ============================================
const getCandidateInterviews = async (req, res) => {
    try {
        const userId = req.user.id;
        const { candidateId } = req.params;

        // Get candidate profile
        const { data: candidateProfile, error: candidateError } = await supabaseAdmin
            .from('candidate_profiles')
            .select('id, user_id')
            .eq('user_id', userId)
            .single();

        if (candidateError || !candidateProfile || candidateProfile.id !== candidateId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Get interviews
        const { data: interviews, error } = await supabaseAdmin
            .from('ai_interviews')
            .select(`
        *,
        jobs:job_id (title, department, company_name),
        recruiter_profiles:recruiter_id (company_name, contact_person)
      `)
            .eq('candidate_id', candidateId)
            .order('scheduled_at', { ascending: false });

        if (error) {
            console.error('[AI Interview] Error fetching interviews:', error);
            return res.status(500).json({ error: 'Failed to fetch interviews' });
        }

        res.json({
            success: true,
            data: { interviews }
        });

    } catch (error) {
        console.error('[AI Interview] Get interviews error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================
// CANDIDATE: Start Interview Session
// ============================================
const startInterview = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id: interviewId } = req.params;

        console.log('[AI Interview] Starting session for interview:', interviewId);
        console.log('[AI Interview] User ID:', userId);

        // Verify candidate owns this interview
        const { data: interview, error: interviewError } = await supabaseAdmin
            .from('ai_interviews')
            .select('*, candidate_profiles!inner(user_id), jobs(title, job_description, required_skills)')
            .eq('id', interviewId)
            .single();

        console.log('[AI Interview] Interview data:', JSON.stringify(interview, null, 2));

        if (interviewError || !interview) {
            console.error('[AI Interview] Interview not found:', interviewError);
            return res.status(404).json({ error: 'Interview not found' });
        }

        // The candidate_profiles is an object, not an array with inner join
        const candidateUserId = interview.candidate_profiles?.user_id;
        console.log('[AI Interview] Candidate user_id from DB:', candidateUserId);

        if (!candidateUserId || candidateUserId !== userId) {
            console.error('[AI Interview] Unauthorized access attempt');
            return res.status(403).json({ error: 'Unauthorized' });
        }

        if (interview.status !== 'scheduled') {
            return res.status(400).json({ error: 'Interview already started or completed' });
        }

        // Update interview status
        await supabaseAdmin
            .from('ai_interviews')
            .update({ status: 'in_progress' })
            .eq('id', interviewId);

        // Create session
        const { data: session, error: sessionError } = await supabaseAdmin
            .from('ai_interview_sessions')
            .insert({
                interview_id: interviewId,
                started_at: new Date().toISOString()
            })
            .select()
            .single();

        if (sessionError) {
            console.error('[AI Interview] Error creating session:', sessionError);
            return res.status(500).json({ error: 'Failed to create session' });
        }

        // Generate first question using AI
        const jobContext = {
            title: interview.jobs.title,
            description: interview.jobs.job_description,
            skills: interview.jobs.required_skills || []
        };

        const firstQuestion = await generateInterviewQuestion(jobContext, 1, []);

        // Save first question
        const { data: questionRecord } = await supabaseAdmin
            .from('ai_interview_questions')
            .insert({
                session_id: session.id,
                question_number: 1,
                question_text: firstQuestion
            })
            .select()
            .single();

        res.json({
            success: true,
            data: {
                session_id: session.id,
                question: firstQuestion,
                question_id: questionRecord.id,
                question_number: 1,
                total_questions: 5
            }
        });

    } catch (error) {
        console.error('[AI Interview] Start error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================
// CANDIDATE: Submit Answer (with Whisper)
// ============================================
const submitAnswer = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id: interviewId } = req.params;
        const { session_id, question_id, audio_base64, answer_text } = req.body;

        console.log('[AI Interview] Submitting answer for question:', question_id);

        // Verify ownership
        const { data: session, error: sessionError } = await supabaseAdmin
            .from('ai_interview_sessions')
            .select('*, ai_interviews!inner(candidate_profiles!inner(user_id), jobs(*))')
            .eq('id', session_id)
            .eq('interview_id', interviewId)
            .single();

        if (sessionError || !session || session.ai_interviews.candidate_profiles.user_id !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        let transcribedText = answer_text;
        let audioDuration = 0;

        // Transcribe audio if provided
        if (audio_base64) {
            try {
                const transcription = await WhisperService.transcribeBase64(audio_base64, 'audio/webm');
                transcribedText = transcription.text;
                audioDuration = Math.round(transcription.duration || 0);
                console.log('[AI Interview] Transcription:', transcribedText.substring(0, 100));
            } catch (transcriptionError) {
                console.error('[AI Interview] Transcription failed:', transcriptionError);
                if (!answer_text) {
                    return res.status(500).json({ error: 'Failed to transcribe audio' });
                }
            }
        }

        // Get question context
        const { data: question } = await supabaseAdmin
            .from('ai_interview_questions')
            .select('*')
            .eq('id', question_id)
            .single();

        // Score the answer using AI
        const score = await scoreAnswer(question.question_text, transcribedText);

        // Update question with answer
        await supabaseAdmin
            .from('ai_interview_questions')
            .update({
                answer_text: transcribedText,
                answer_duration_seconds: audioDuration,
                ai_score: score.score,
                ai_feedback: score.feedback
            })
            .eq('id', question_id);

        // Check if more questions needed
        const { data: allQuestions } = await supabaseAdmin
            .from('ai_interview_questions')
            .select('*')
            .eq('session_id', session_id)
            .order('question_number');

        const nextQuestionNumber = allQuestions.length + 1;
        const maxQuestions = 5;

        if (nextQuestionNumber <= maxQuestions) {
            const previousQA = allQuestions.map(q => ({
                question: q.question_text,
                answer: q.answer_text
            }));

            const nextQuestion = await generateInterviewQuestion(
                session.ai_interviews.jobs,
                nextQuestionNumber,
                previousQA
            );

            const { data: nextQuestionRecord } = await supabaseAdmin
                .from('ai_interview_questions')
                .insert({
                    session_id: session_id,
                    question_number: nextQuestionNumber,
                    question_text: nextQuestion
                })
                .select()
                .single();

            res.json({
                success: true,
                data: {
                    score: score.score,
                    feedback: score.feedback,
                    next_question: nextQuestion,
                    next_question_id: nextQuestionRecord.id,
                    question_number: nextQuestionNumber,
                    total_questions: maxQuestions,
                    is_complete: false
                }
            });
        } else {
            res.json({
                success: true,
                data: {
                    score: score.score,
                    feedback: score.feedback,
                    is_complete: true,
                    message: 'Interview completed! Please click "Finish Interview" to submit.'
                }
            });
        }

    } catch (error) {
        console.error('[AI Interview] Submit answer error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================
// CANDIDATE: Log Attention Data
// ============================================
const logAttention = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id: interviewId } = req.params;
        const { session_id, attention_detected, face_detected, eyes_on_screen, head_pose } = req.body;

        // Verify ownership (lightweight check)
        const { data: session } = await supabaseAdmin
            .from('ai_interview_sessions')
            .select('id, ai_interviews!inner(candidate_profiles!inner(user_id))')
            .eq('id', session_id)
            .single();

        if (!session || session.ai_interviews.candidate_profiles.user_id !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Insert attention log
        await supabaseAdmin
            .from('ai_interview_attention_logs')
            .insert({
                session_id,
                attention_detected,
                face_detected,
                eyes_on_screen,
                head_pose
            });

        res.json({ success: true });

    } catch (error) {
        console.error('[AI Interview] Log attention error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================
// CANDIDATE: Complete Interview
// ============================================
const completeInterview = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id: interviewId } = req.params;
        const { session_id, tab_switches = 0, fullscreen_exits = 0 } = req.body;

        console.log('[AI Interview] Completing interview:', interviewId);

        // Verify ownership
        const { data: session } = await supabaseAdmin
            .from('ai_interview_sessions')
            .select('*, ai_interviews!inner(candidate_profiles!inner(user_id))')
            .eq('id', session_id)
            .single();

        if (!session || session.ai_interviews.candidate_profiles.user_id !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Calculate attention score
        const { data: attentionLogs } = await supabaseAdmin
            .from('ai_interview_attention_logs')
            .select('attention_detected')
            .eq('session_id', session_id);

        const attentionScore = attentionLogs && attentionLogs.length > 0
            ? (attentionLogs.filter(log => log.attention_detected).length / attentionLogs.length) * 100
            : 0;

        // Calculate overall score from questions
        const { data: questions } = await supabaseAdmin
            .from('ai_interview_questions')
            .select('ai_score')
            .eq('session_id', session_id);

        const avgQuestionScore = questions && questions.length > 0
            ? questions.reduce((sum, q) => sum + (q.ai_score || 0), 0) / questions.length
            : 0;

        const overallScore = (avgQuestionScore * 10 * 0.7) + (attentionScore * 0.3);

        // Generate AI feedback
        const aiFeedback = await generateFinalFeedback(questions, attentionScore, tab_switches, fullscreen_exits);

        // Update session
        await supabaseAdmin
            .from('ai_interview_sessions')
            .update({
                ended_at: new Date().toISOString(),
                attention_score: Math.round(attentionScore),
                tab_switches,
                fullscreen_exits,
                overall_score: Math.round(overallScore),
                ai_feedback: aiFeedback
            })
            .eq('id', session_id);

        // Update interview status
        await supabaseAdmin
            .from('ai_interviews')
            .update({ status: 'completed' })
            .eq('id', interviewId);

        res.json({
            success: true,
            data: {
                overall_score: Math.round(overallScore),
                attention_score: Math.round(attentionScore),
                feedback: aiFeedback
            }
        });

    } catch (error) {
        console.error('[AI Interview] Complete error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================
// RECRUITER: Get Interview Report
// ============================================
const getInterviewReport = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id: interviewId } = req.params;

        // Get recruiter profile
        const { data: recruiterProfile } = await supabaseAdmin
            .from('recruiter_profiles')
            .select('id')
            .eq('user_id', userId)
            .single();

        if (!recruiterProfile) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Get interview with all related data
        const { data: interview, error } = await supabaseAdmin
            .from('ai_interviews')
            .select(`
        *,
        jobs:job_id (title, department),
        candidate_profiles:candidate_id (user_id, users(full_name, email)),
        ai_interview_sessions (
          *,
          ai_interview_questions (*)
        )
      `)
            .eq('id', interviewId)
            .eq('recruiter_id', recruiterProfile.id)
            .single();

        if (error || !interview) {
            return res.status(404).json({ error: 'Interview not found' });
        }

        // Get attention logs summary
        const session = interview.ai_interview_sessions[0];
        if (session) {
            const { data: attentionLogs } = await supabaseAdmin
                .from('ai_interview_attention_logs')
                .select('*')
                .eq('session_id', session.id)
                .order('timestamp');

            interview.ai_interview_sessions[0].attention_logs = attentionLogs;
        }

        res.json({
            success: true,
            data: { interview }
        });

    } catch (error) {
        console.error('[AI Interview] Get report error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================
// TEST: Create Demo Interview (Self-Service)
// ============================================
const createTestInterview = async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Get Candidate Profile ID
        const { data: candidate, error: candError } = await supabaseAdmin
            .from('candidate_profiles')
            .select('id')
            .eq('user_id', userId)
            .single();

        if (candError || !candidate) {
            return res.status(404).json({ error: 'Candidate profile not found. Please complete your profile first.' });
        }

        // 2. Find ANY Job to link to (just for demo)
        const { data: job, error: jobError } = await supabaseAdmin
            .from('jobs')
            .select('id, recruiter_id')
            .limit(1)
            .single();

        if (jobError || !job) {
            return res.status(404).json({ error: 'No jobs available in the system to create a test interview.' });
        }

        // 3. Create Interview
        const { data: interview, error: insertError } = await supabaseAdmin
            .from('ai_interviews')
            .insert({
                job_id: job.id,
                candidate_id: candidate.id,
                recruiter_id: job.recruiter_id,
                scheduled_at: new Date().toISOString(),
                status: 'scheduled',
                duration_minutes: 15
            })
            .select()
            .single();

        if (insertError) {
            return res.status(500).json({ error: 'Failed to create test interview', details: insertError.message });
        }

        res.json({ success: true, data: { interview } });

    } catch (error) {
        console.error('[AI Interview] Create test error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

async function generateInterviewQuestion(jobContext, questionNumber, previousQA) {
    const prompt = `
You are conducting a technical interview for the position: "${jobContext.title}".

Job Description: ${jobContext.job_description?.substring(0, 300)}
Required Skills: ${jobContext.required_skills?.join(', ')}

This is question ${questionNumber} of 5.

${previousQA.length > 0 ? `Previous Q&A:\n${previousQA.map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`).join('\n\n')}` : ''}

Generate the next interview question. Make it:
- Relevant to the job requirements
- Progressive in difficulty (start easy, get harder)
- Technical or behavioral based on question number
- Clear and concise

Return ONLY the question text, no additional formatting.
  `;

    try {
        const response = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_completion_tokens: 200
        });

        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error('Question generation error:', error);
        return `Tell me about your experience with ${jobContext.required_skills?.[0] || 'this field'}.`;
    }
}

async function scoreAnswer(question, answer) {
    const prompt = `
Interview Question: ${question}
Candidate Answer: ${answer}

Score this answer from 0-10 and provide brief feedback (2-3 sentences).

Return ONLY a JSON object:
{
  "score": 7.5,
  "feedback": "Good explanation of..."
}
  `;

    try {
        const response = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_completion_tokens: 150
        });

        const result = JSON.parse(response.choices[0].message.content.trim());
        return result;
    } catch (error) {
        console.error('Scoring error:', error);
        return { score: 5, feedback: 'Unable to score answer automatically.' };
    }
}

async function generateFinalFeedback(questions, attentionScore, tabSwitches, fullscreenExits) {
    const avgScore = questions.reduce((sum, q) => sum + (q.ai_score || 0), 0) / questions.length;

    const prompt = `
Generate final interview feedback summary.

Average Answer Score: ${avgScore.toFixed(1)}/10
Attention Score: ${attentionScore.toFixed(0)}%
Tab Switches: ${tabSwitches}
Fullscreen Exits: ${fullscreenExits}

Provide a 3-4 sentence professional summary highlighting:
- Overall performance
- Strengths
- Areas for improvement
- Any red flags (if tab switches/exits are high)

Be constructive and professional.
  `;

    try {
        const response = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.5,
            max_completion_tokens: 200
        });

        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error('Feedback generation error:', error);
        return 'Interview completed. Detailed feedback unavailable.';
    }
}

module.exports = {
    scheduleInterview,
    getCandidateInterviews,
    startInterview,
    submitAnswer,
    logAttention,
    completeInterview,
    logAttention,
    completeInterview,
    getInterviewReport,
    createTestInterview
};
