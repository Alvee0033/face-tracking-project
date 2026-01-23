-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES TABLE (Base for all users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT CHECK (role IN ('candidate', 'recruiter', 'admin')),
  phone_number TEXT,
  profile_picture_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RECRUITER PROFILES
CREATE TABLE IF NOT EXISTS public.recruiter_profiles (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  company_name TEXT DEFAULT 'Not Set',
  company_website TEXT,
  position TEXT,
  country TEXT DEFAULT 'Not Set',
  city TEXT DEFAULT 'Not Set',
  about_company TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CANDIDATE PROFILES
CREATE TABLE IF NOT EXISTS public.candidate_profiles (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  profile_type TEXT DEFAULT 'Professional',
  bio TEXT,
  resume_url TEXT,
  portfolio_url TEXT,
  github_url TEXT,
  linkedin_url TEXT,
  skills TEXT[],
  experience TEXT DEFAULT 'Entry Level', -- 'Entry Level', 'Mid Level', 'Senior', etc.
  education TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- JOBS TABLE
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recruiter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT,
  type TEXT DEFAULT 'Full-time', -- 'Full-time', 'Part-time', 'Contract'
  location TEXT, -- 'Remote', 'On-site', 'Hybrid'
  salary_min DECIMAL,
  salary_max DECIMAL,
  salary_currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'active', -- 'active', 'closed', 'draft'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  candidate_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  cover_letter TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'interview', 'rejected', 'accepted'
  resume_url TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, candidate_id)
);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruiter_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- POLICIES (Simple Setup for now)
-- Profiles: Public read, Self update
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Jobs: Public read (active only usually, but simplified here), Recruiter CRUD
CREATE POLICY "Jobs are viewable by everyone" 
ON public.jobs FOR SELECT USING (true);

CREATE POLICY "Recruiters can insert jobs" 
ON public.jobs FOR INSERT WITH CHECK (auth.uid() = recruiter_id);

CREATE POLICY "Recruiters can update own jobs" 
ON public.jobs FOR UPDATE USING (auth.uid() = recruiter_id);

CREATE POLICY "Recruiters can delete own jobs" 
ON public.jobs FOR DELETE USING (auth.uid() = recruiter_id);

-- Applications: Candidate can create, Recruiter can view for their jobs
CREATE POLICY "Candidates can create applications" 
ON public.applications FOR INSERT WITH CHECK (auth.uid() = candidate_id);

CREATE POLICY "Candidates can view own applications" 
ON public.applications FOR SELECT USING (auth.uid() = candidate_id);

-- Complex policy for Recruiters viewing applications for their jobs
CREATE POLICY "Recruiters can view applications for their jobs" 
ON public.applications FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE public.jobs.id = public.applications.job_id 
    AND public.jobs.recruiter_id = auth.uid()
  )
);
