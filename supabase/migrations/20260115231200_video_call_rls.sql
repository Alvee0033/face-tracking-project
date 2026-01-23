-- Ensure video_calls table exists
CREATE TABLE IF NOT EXISTS video_calls (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  channel_name TEXT NOT NULL,
  token TEXT,
  status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, ongoing, completed, cancelled
  initiated_by UUID REFERENCES auth.users(id),
  scheduled_by UUID REFERENCES auth.users(id),
  scheduled_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  interview_title TEXT,
  interview_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE video_calls ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "View video calls" ON video_calls;
DROP POLICY IF EXISTS "Insert video calls" ON video_calls;
DROP POLICY IF EXISTS "Update video calls" ON video_calls;

-- Policies

-- 1. View: Recruiters and Candidates can view calls they are part of (via conversation)
CREATE POLICY "View video calls"
  ON video_calls FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE candidate_id = auth.uid() OR recruiter_id = auth.uid()
    )
  );

-- 2. Insert: Only Recruiters (or participants) can insert. 
-- For scheduling, it's usually the recruiter.
CREATE POLICY "Insert video calls"
  ON video_calls FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE recruiter_id = auth.uid() OR candidate_id = auth.uid()
    )
  );

-- 3. Update: Participants can update (e.g. end call, cancel)
CREATE POLICY "Update video calls"
  ON video_calls FOR UPDATE
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE recruiter_id = auth.uid() OR candidate_id = auth.uid()
    )
  );

-- Fix conversations RLS if missing
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View conversations"
  ON conversations FOR SELECT
  USING (
    candidate_id = auth.uid() OR recruiter_id = auth.uid()
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_video_calls_conversation ON video_calls(conversation_id);
CREATE INDEX IF NOT EXISTS idx_video_calls_scheduled_at ON video_calls(scheduled_at);
