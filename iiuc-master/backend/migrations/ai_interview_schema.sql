-- AI Interview System Schema Migration
-- Run this in your Supabase SQL editor

-- 1. Create ai_interviews table
CREATE TABLE IF NOT EXISTS ai_interviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    recruiter_id UUID NOT NULL REFERENCES recruiter_profiles(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create ai_interview_sessions table
CREATE TABLE IF NOT EXISTS ai_interview_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID NOT NULL REFERENCES ai_interviews(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    attention_score FLOAT CHECK (attention_score >= 0 AND attention_score <= 100),
    tab_switches INTEGER DEFAULT 0,
    fullscreen_exits INTEGER DEFAULT 0,
    overall_score FLOAT CHECK (overall_score >= 0 AND overall_score <= 100),
    ai_feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create ai_interview_questions table
CREATE TABLE IF NOT EXISTS ai_interview_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES ai_interview_sessions(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_number INTEGER NOT NULL,
    asked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    answer_text TEXT,
    answer_audio_url TEXT,
    answer_duration_seconds INTEGER,
    ai_score FLOAT CHECK (ai_score >= 0 AND ai_score <= 10),
    ai_feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create ai_interview_attention_logs table
CREATE TABLE IF NOT EXISTS ai_interview_attention_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES ai_interview_sessions(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    attention_detected BOOLEAN NOT NULL,
    face_detected BOOLEAN NOT NULL,
    eyes_on_screen BOOLEAN NOT NULL,
    head_pose JSONB -- {pitch, yaw, roll}
);

-- 5. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ai_interviews_candidate ON ai_interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_ai_interviews_recruiter ON ai_interviews(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_ai_interviews_job ON ai_interviews(job_id);
CREATE INDEX IF NOT EXISTS idx_ai_interviews_status ON ai_interviews(status);
CREATE INDEX IF NOT EXISTS idx_ai_interview_sessions_interview ON ai_interview_sessions(interview_id);
CREATE INDEX IF NOT EXISTS idx_ai_interview_questions_session ON ai_interview_questions(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_interview_attention_logs_session ON ai_interview_attention_logs(session_id);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE ai_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interview_attention_logs ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for ai_interviews
-- Candidates can view their own interviews
CREATE POLICY "Candidates can view their own interviews"
    ON ai_interviews FOR SELECT
    USING (candidate_id = auth.uid());

-- Recruiters can view interviews they created
CREATE POLICY "Recruiters can view their interviews"
    ON ai_interviews FOR SELECT
    USING (recruiter_id = auth.uid());

-- Recruiters can create interviews
CREATE POLICY "Recruiters can create interviews"
    ON ai_interviews FOR INSERT
    WITH CHECK (recruiter_id = auth.uid());

-- Recruiters can update their interviews
CREATE POLICY "Recruiters can update their interviews"
    ON ai_interviews FOR UPDATE
    USING (recruiter_id = auth.uid());

-- 8. RLS Policies for ai_interview_sessions
-- Candidates can view sessions for their interviews
CREATE POLICY "Candidates can view their interview sessions"
    ON ai_interview_sessions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM ai_interviews
            WHERE ai_interviews.id = ai_interview_sessions.interview_id
            AND ai_interviews.candidate_id = auth.uid()
        )
    );

-- Recruiters can view sessions for their interviews
CREATE POLICY "Recruiters can view interview sessions"
    ON ai_interview_sessions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM ai_interviews
            WHERE ai_interviews.id = ai_interview_sessions.interview_id
            AND ai_interviews.recruiter_id = auth.uid()
        )
    );

-- Candidates can create sessions for their interviews
CREATE POLICY "Candidates can create interview sessions"
    ON ai_interview_sessions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM ai_interviews
            WHERE ai_interviews.id = interview_id
            AND ai_interviews.candidate_id = auth.uid()
        )
    );

-- Candidates can update their sessions
CREATE POLICY "Candidates can update their sessions"
    ON ai_interview_sessions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM ai_interviews
            WHERE ai_interviews.id = ai_interview_sessions.interview_id
            AND ai_interviews.candidate_id = auth.uid()
        )
    );

-- 9. RLS Policies for ai_interview_questions (similar pattern)
CREATE POLICY "View interview questions"
    ON ai_interview_questions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM ai_interview_sessions s
            JOIN ai_interviews i ON i.id = s.interview_id
            WHERE s.id = ai_interview_questions.session_id
            AND (i.candidate_id = auth.uid() OR i.recruiter_id = auth.uid())
        )
    );

CREATE POLICY "Insert interview questions"
    ON ai_interview_questions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM ai_interview_sessions s
            JOIN ai_interviews i ON i.id = s.interview_id
            WHERE s.id = session_id
            AND i.candidate_id = auth.uid()
        )
    );

CREATE POLICY "Update interview questions"
    ON ai_interview_questions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM ai_interview_sessions s
            JOIN ai_interviews i ON i.id = s.interview_id
            WHERE s.id = ai_interview_questions.session_id
            AND i.candidate_id = auth.uid()
        )
    );

-- 10. RLS Policies for ai_interview_attention_logs
CREATE POLICY "View attention logs"
    ON ai_interview_attention_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM ai_interview_sessions s
            JOIN ai_interviews i ON i.id = s.interview_id
            WHERE s.id = ai_interview_attention_logs.session_id
            AND (i.candidate_id = auth.uid() OR i.recruiter_id = auth.uid())
        )
    );

CREATE POLICY "Insert attention logs"
    ON ai_interview_attention_logs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM ai_interview_sessions s
            JOIN ai_interviews i ON i.id = s.interview_id
            WHERE s.id = session_id
            AND i.candidate_id = auth.uid()
        )
    );

-- 11. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 12. Add trigger to ai_interviews
CREATE TRIGGER update_ai_interviews_updated_at BEFORE UPDATE ON ai_interviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
