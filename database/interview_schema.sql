-- ============================================
-- AI INTERVIEW SYSTEM SCHEMA
-- ============================================
-- This migration adds tables and enums for the AI-powered interview system
-- Run this after COMPLETE_SCHEMA_FIXED.sql

-- ============================================
-- NEW ENUMS
-- ============================================

-- Interview question types
DO $$ BEGIN
    CREATE TYPE interview_question_type AS ENUM ('technical', 'behavioral', 'situational', 'general');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Interview session status
DO $$ BEGIN
    CREATE TYPE interview_status AS ENUM ('not_started', 'in_progress', 'completed', 'abandoned');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================
-- UPDATE EXISTING ENUMS
-- ============================================

-- Add new application statuses for interview flow
DO $$ BEGIN
    ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'interview_assigned';
    ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'interview_completed';
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================
-- INTERVIEW TEMPLATES TABLE
-- ============================================
-- Stores interview templates created by recruiters

CREATE TABLE IF NOT EXISTS public.interview_templates (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  recruiter_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  topic text,
  is_ai_generated boolean DEFAULT false,
  duration_minutes integer DEFAULT 30,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT interview_templates_pkey PRIMARY KEY (id),
  CONSTRAINT interview_templates_recruiter_id_fkey FOREIGN KEY (recruiter_id) REFERENCES public.recruiter_profiles(id) ON DELETE CASCADE
);

-- Index for faster recruiter queries
CREATE INDEX IF NOT EXISTS idx_interview_templates_recruiter_id ON public.interview_templates(recruiter_id);

-- ============================================
-- INTERVIEW QUESTIONS TABLE
-- ============================================
-- Stores questions for each interview template

CREATE TABLE IF NOT EXISTS public.interview_questions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  template_id uuid NOT NULL,
  question_text text NOT NULL,
  question_type interview_question_type NOT NULL DEFAULT 'general'::interview_question_type,
  order_index integer NOT NULL,
  expected_duration_seconds integer DEFAULT 120,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT interview_questions_pkey PRIMARY KEY (id),
  CONSTRAINT interview_questions_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.interview_templates(id) ON DELETE CASCADE,
  CONSTRAINT interview_questions_order_index_check CHECK (order_index >= 0)
);

-- Index for faster template queries
CREATE INDEX IF NOT EXISTS idx_interview_questions_template_id ON public.interview_questions(template_id);

-- ============================================
-- INTERVIEW SESSIONS TABLE
-- ============================================
-- Tracks individual interview sessions for candidates

CREATE TABLE IF NOT EXISTS public.interview_sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  application_id uuid NOT NULL,
  template_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  job_id uuid NOT NULL,
  status interview_status NOT NULL DEFAULT 'not_started'::interview_status,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  total_duration_seconds integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT interview_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT interview_sessions_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.job_applications(id) ON DELETE CASCADE,
  CONSTRAINT interview_sessions_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.interview_templates(id) ON DELETE RESTRICT,
  CONSTRAINT interview_sessions_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  CONSTRAINT interview_sessions_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE,
  CONSTRAINT interview_sessions_application_id_unique UNIQUE (application_id)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_interview_sessions_candidate_id ON public.interview_sessions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_application_id ON public.interview_sessions(application_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_status ON public.interview_sessions(status);

-- ============================================
-- INTERVIEW RESPONSES TABLE
-- ============================================
-- Stores candidate responses to each question

CREATE TABLE IF NOT EXISTS public.interview_responses (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  session_id uuid NOT NULL,
  question_id uuid NOT NULL,
  audio_url text,
  transcription_text text,
  response_duration_seconds integer DEFAULT 0,
  answered_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT interview_responses_pkey PRIMARY KEY (id),
  CONSTRAINT interview_responses_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  CONSTRAINT interview_responses_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.interview_questions(id) ON DELETE RESTRICT,
  CONSTRAINT interview_responses_session_question_unique UNIQUE (session_id, question_id)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_interview_responses_session_id ON public.interview_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_interview_responses_question_id ON public.interview_responses(question_id);

-- ============================================
-- ATTENTION TRACKING DATA TABLE
-- ============================================
-- Stores attention metrics during interviews

CREATE TABLE IF NOT EXISTS public.attention_tracking_data (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  session_id uuid NOT NULL,
  timestamp timestamp with time zone DEFAULT timezone('utc'::text, now()),
  is_focused boolean DEFAULT true,
  face_detected boolean DEFAULT true,
  gaze_direction text,
  head_pose jsonb,
  window_blur_count integer DEFAULT 0,
  suspicious_activity_flags jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT attention_tracking_data_pkey PRIMARY KEY (id),
  CONSTRAINT attention_tracking_data_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.interview_sessions(id) ON DELETE CASCADE
);

-- Index for faster session queries
CREATE INDEX IF NOT EXISTS idx_attention_tracking_data_session_id ON public.attention_tracking_data(session_id);
CREATE INDEX IF NOT EXISTS idx_attention_tracking_data_timestamp ON public.attention_tracking_data(timestamp);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.interview_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attention_tracking_data ENABLE ROW LEVEL SECURITY;

-- Interview Templates Policies
-- Recruiters can view, create, update, delete their own templates
CREATE POLICY "Recruiters can view their own interview templates"
  ON public.interview_templates FOR SELECT
  USING (
    recruiter_id IN (
      SELECT id FROM public.recruiter_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Recruiters can create interview templates"
  ON public.interview_templates FOR INSERT
  WITH CHECK (
    recruiter_id IN (
      SELECT id FROM public.recruiter_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Recruiters can update their own interview templates"
  ON public.interview_templates FOR UPDATE
  USING (
    recruiter_id IN (
      SELECT id FROM public.recruiter_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Recruiters can delete their own interview templates"
  ON public.interview_templates FOR DELETE
  USING (
    recruiter_id IN (
      SELECT id FROM public.recruiter_profiles WHERE user_id = auth.uid()
    )
  );

-- Interview Questions Policies
-- Recruiters can manage questions for their templates
CREATE POLICY "Recruiters can view questions for their templates"
  ON public.interview_questions FOR SELECT
  USING (
    template_id IN (
      SELECT id FROM public.interview_templates 
      WHERE recruiter_id IN (
        SELECT id FROM public.recruiter_profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Recruiters can create questions for their templates"
  ON public.interview_questions FOR INSERT
  WITH CHECK (
    template_id IN (
      SELECT id FROM public.interview_templates 
      WHERE recruiter_id IN (
        SELECT id FROM public.recruiter_profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Recruiters can update questions for their templates"
  ON public.interview_questions FOR UPDATE
  USING (
    template_id IN (
      SELECT id FROM public.interview_templates 
      WHERE recruiter_id IN (
        SELECT id FROM public.recruiter_profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Recruiters can delete questions for their templates"
  ON public.interview_questions FOR DELETE
  USING (
    template_id IN (
      SELECT id FROM public.interview_templates 
      WHERE recruiter_id IN (
        SELECT id FROM public.recruiter_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Candidates can view questions for their assigned interviews
CREATE POLICY "Candidates can view questions for their interviews"
  ON public.interview_questions FOR SELECT
  USING (
    template_id IN (
      SELECT template_id FROM public.interview_sessions 
      WHERE candidate_id IN (
        SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Interview Sessions Policies
-- Recruiters can view sessions for their jobs
CREATE POLICY "Recruiters can view interview sessions for their jobs"
  ON public.interview_sessions FOR SELECT
  USING (
    job_id IN (
      SELECT id FROM public.jobs 
      WHERE recruiter_id IN (
        SELECT id FROM public.recruiter_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Candidates can view their own sessions
CREATE POLICY "Candidates can view their own interview sessions"
  ON public.interview_sessions FOR SELECT
  USING (
    candidate_id IN (
      SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
    )
  );

-- Candidates can update their own sessions
CREATE POLICY "Candidates can update their own interview sessions"
  ON public.interview_sessions FOR UPDATE
  USING (
    candidate_id IN (
      SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
    )
  );

-- Interview Responses Policies
-- Recruiters can view responses for their jobs
CREATE POLICY "Recruiters can view interview responses for their jobs"
  ON public.interview_responses FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM public.interview_sessions 
      WHERE job_id IN (
        SELECT id FROM public.jobs 
        WHERE recruiter_id IN (
          SELECT id FROM public.recruiter_profiles WHERE user_id = auth.uid()
        )
      )
    )
  );

-- Candidates can view and create their own responses
CREATE POLICY "Candidates can view their own interview responses"
  ON public.interview_responses FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM public.interview_sessions 
      WHERE candidate_id IN (
        SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Candidates can create their own interview responses"
  ON public.interview_responses FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM public.interview_sessions 
      WHERE candidate_id IN (
        SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Attention Tracking Data Policies
-- Recruiters can view attention data for their jobs
CREATE POLICY "Recruiters can view attention tracking data for their jobs"
  ON public.attention_tracking_data FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM public.interview_sessions 
      WHERE job_id IN (
        SELECT id FROM public.jobs 
        WHERE recruiter_id IN (
          SELECT id FROM public.recruiter_profiles WHERE user_id = auth.uid()
        )
      )
    )
  );

-- Candidates can create attention tracking data for their sessions
CREATE POLICY "Candidates can create attention tracking data"
  ON public.attention_tracking_data FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM public.interview_sessions 
      WHERE candidate_id IN (
        SELECT id FROM public.candidate_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.interview_templates IS 'Stores interview templates created by recruiters with questions and settings';
COMMENT ON TABLE public.interview_questions IS 'Stores questions for each interview template with order and type';
COMMENT ON TABLE public.interview_sessions IS 'Tracks individual interview sessions assigned to candidates';
COMMENT ON TABLE public.interview_responses IS 'Stores candidate responses with audio and transcription for each question';
COMMENT ON TABLE public.attention_tracking_data IS 'Stores attention tracking metrics during interviews for proctoring';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
