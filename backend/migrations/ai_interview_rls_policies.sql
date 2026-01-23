-- AI Interview System - RLS Policies and Indexes Only
-- Tables already exist, this just adds security policies and performance indexes

-- ============================================
-- INDEXES (for better query performance)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_ai_interviews_candidate ON ai_interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_ai_interviews_recruiter ON ai_interviews(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_ai_interviews_job ON ai_interviews(job_id);
CREATE INDEX IF NOT EXISTS idx_ai_interviews_status ON ai_interviews(status);
CREATE INDEX IF NOT EXISTS idx_ai_interview_sessions_interview ON ai_interview_sessions(interview_id);
CREATE INDEX IF NOT EXISTS idx_ai_interview_questions_session ON ai_interview_questions(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_interview_attention_logs_session ON ai_interview_attention_logs(session_id);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE ai_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interview_attention_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES for ai_interviews
-- ============================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Candidates can view their own interviews" ON ai_interviews;
DROP POLICY IF EXISTS "Recruiters can view their interviews" ON ai_interviews;
DROP POLICY IF EXISTS "Recruiters can create interviews" ON ai_interviews;
DROP POLICY IF EXISTS "Recruiters can update their interviews" ON ai_interviews;

-- Candidates can view their own interviews
CREATE POLICY "Candidates can view their own interviews"
    ON ai_interviews FOR SELECT
    USING (
        candidate_id IN (
            SELECT id FROM candidate_profiles WHERE user_id = auth.uid()
        )
    );

-- Recruiters can view interviews they created
CREATE POLICY "Recruiters can view their interviews"
    ON ai_interviews FOR SELECT
    USING (
        recruiter_id IN (
            SELECT id FROM recruiter_profiles WHERE user_id = auth.uid()
        )
    );

-- Recruiters can create interviews
CREATE POLICY "Recruiters can create interviews"
    ON ai_interviews FOR INSERT
    WITH CHECK (
        recruiter_id IN (
            SELECT id FROM recruiter_profiles WHERE user_id = auth.uid()
        )
    );

-- Recruiters can update their interviews
CREATE POLICY "Recruiters can update their interviews"
    ON ai_interviews FOR UPDATE
    USING (
        recruiter_id IN (
            SELECT id FROM recruiter_profiles WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- RLS POLICIES for ai_interview_sessions
-- ============================================

DROP POLICY IF EXISTS "Candidates can view their interview sessions" ON ai_interview_sessions;
DROP POLICY IF EXISTS "Recruiters can view interview sessions" ON ai_interview_sessions;
DROP POLICY IF EXISTS "Candidates can create interview sessions" ON ai_interview_sessions;
DROP POLICY IF EXISTS "Candidates can update their sessions" ON ai_interview_sessions;

-- Candidates can view sessions for their interviews
CREATE POLICY "Candidates can view their interview sessions"
    ON ai_interview_sessions FOR SELECT
    USING (
        interview_id IN (
            SELECT id FROM ai_interviews 
            WHERE candidate_id IN (
                SELECT id FROM candidate_profiles WHERE user_id = auth.uid()
            )
        )
    );

-- Recruiters can view sessions for their interviews
CREATE POLICY "Recruiters can view interview sessions"
    ON ai_interview_sessions FOR SELECT
    USING (
        interview_id IN (
            SELECT id FROM ai_interviews 
            WHERE recruiter_id IN (
                SELECT id FROM recruiter_profiles WHERE user_id = auth.uid()
            )
        )
    );

-- Candidates can create sessions for their interviews
CREATE POLICY "Candidates can create interview sessions"
    ON ai_interview_sessions FOR INSERT
    WITH CHECK (
        interview_id IN (
            SELECT id FROM ai_interviews 
            WHERE candidate_id IN (
                SELECT id FROM candidate_profiles WHERE user_id = auth.uid()
            )
        )
    );

-- Candidates can update their sessions
CREATE POLICY "Candidates can update their sessions"
    ON ai_interview_sessions FOR UPDATE
    USING (
        interview_id IN (
            SELECT id FROM ai_interviews 
            WHERE candidate_id IN (
                SELECT id FROM candidate_profiles WHERE user_id = auth.uid()
            )
        )
    );

-- ============================================
-- RLS POLICIES for ai_interview_questions
-- ============================================

DROP POLICY IF EXISTS "View interview questions" ON ai_interview_questions;
DROP POLICY IF EXISTS "Insert interview questions" ON ai_interview_questions;
DROP POLICY IF EXISTS "Update interview questions" ON ai_interview_questions;

CREATE POLICY "View interview questions"
    ON ai_interview_questions FOR SELECT
    USING (
        session_id IN (
            SELECT s.id FROM ai_interview_sessions s
            JOIN ai_interviews i ON i.id = s.interview_id
            WHERE i.candidate_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid())
               OR i.recruiter_id IN (SELECT id FROM recruiter_profiles WHERE user_id = auth.uid())
        )
    );

CREATE POLICY "Insert interview questions"
    ON ai_interview_questions FOR INSERT
    WITH CHECK (
        session_id IN (
            SELECT s.id FROM ai_interview_sessions s
            JOIN ai_interviews i ON i.id = s.interview_id
            WHERE i.candidate_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid())
        )
    );

CREATE POLICY "Update interview questions"
    ON ai_interview_questions FOR UPDATE
    USING (
        session_id IN (
            SELECT s.id FROM ai_interview_sessions s
            JOIN ai_interviews i ON i.id = s.interview_id
            WHERE i.candidate_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid())
        )
    );

-- ============================================
-- RLS POLICIES for ai_interview_attention_logs
-- ============================================

DROP POLICY IF EXISTS "View attention logs" ON ai_interview_attention_logs;
DROP POLICY IF EXISTS "Insert attention logs" ON ai_interview_attention_logs;

CREATE POLICY "View attention logs"
    ON ai_interview_attention_logs FOR SELECT
    USING (
        session_id IN (
            SELECT s.id FROM ai_interview_sessions s
            JOIN ai_interviews i ON i.id = s.interview_id
            WHERE i.candidate_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid())
               OR i.recruiter_id IN (SELECT id FROM recruiter_profiles WHERE user_id = auth.uid())
        )
    );

CREATE POLICY "Insert attention logs"
    ON ai_interview_attention_logs FOR INSERT
    WITH CHECK (
        session_id IN (
            SELECT s.id FROM ai_interview_sessions s
            JOIN ai_interviews i ON i.id = s.interview_id
            WHERE i.candidate_id IN (SELECT id FROM candidate_profiles WHERE user_id = auth.uid())
        )
    );

-- ============================================
-- TRIGGER for updated_at
-- ============================================

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to ai_interviews
DROP TRIGGER IF EXISTS update_ai_interviews_updated_at ON ai_interviews;
CREATE TRIGGER update_ai_interviews_updated_at 
    BEFORE UPDATE ON ai_interviews
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'AI Interview RLS policies and indexes created successfully!';
END $$;
