-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admin_profiles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE,
  admin_level text DEFAULT 'super_admin'::text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT admin_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT admin_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.calls (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL,
  caller_type USER-DEFINED NOT NULL,
  caller_id uuid NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'initiated'::call_status,
  started_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  answered_at timestamp with time zone,
  ended_at timestamp with time zone,
  duration_seconds integer DEFAULT 0,
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT calls_pkey PRIMARY KEY (id),
  CONSTRAINT calls_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id),
  CONSTRAINT calls_caller_id_fkey FOREIGN KEY (caller_id) REFERENCES public.recruiter_profiles(id)
);
CREATE TABLE public.candidate_certifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  candidate_id uuid NOT NULL,
  certification_name text NOT NULL,
  issuing_organization text NOT NULL,
  issue_date date NOT NULL,
  expiry_date date,
  does_not_expire boolean DEFAULT false,
  credential_id text,
  credential_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT candidate_certifications_pkey PRIMARY KEY (id),
  CONSTRAINT candidate_certifications_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profiles(id)
);
CREATE TABLE public.candidate_courses (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  candidate_id uuid NOT NULL,
  skill_name text NOT NULL,
  skill_level text,
  phase_number integer,
  youtube_video_id text NOT NULL,
  video_title text NOT NULL,
  video_description text,
  thumbnail_url text,
  channel_name text,
  duration text,
  published_at text,
  is_watched boolean DEFAULT false,
  is_archived boolean DEFAULT false,
  watched_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT candidate_courses_pkey PRIMARY KEY (id),
  CONSTRAINT candidate_courses_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profiles(id)
);
CREATE TABLE public.candidate_education (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  candidate_id uuid NOT NULL,
  education_type USER-DEFINED NOT NULL DEFAULT 'Undergraduate'::education_type,
  degree text NOT NULL,
  field_of_study text NOT NULL,
  institution text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  is_current boolean DEFAULT false,
  grade text,
  achievements text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT candidate_education_pkey PRIMARY KEY (id),
  CONSTRAINT candidate_education_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profiles(id)
);
CREATE TABLE public.candidate_experience (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  candidate_id uuid NOT NULL,
  experience_type USER-DEFINED NOT NULL DEFAULT 'Full-time Job'::experience_type,
  job_title text NOT NULL,
  company text NOT NULL,
  location text,
  start_date date NOT NULL,
  end_date date,
  is_current boolean DEFAULT false,
  description text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT candidate_experience_pkey PRIMARY KEY (id),
  CONSTRAINT candidate_experience_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profiles(id)
);
CREATE TABLE public.candidate_job_preferences (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  candidate_id uuid NOT NULL UNIQUE,
  looking_for ARRAY,
  preferred_roles ARRAY,
  expected_salary_min integer,
  expected_salary_max integer,
  salary_currency text DEFAULT 'USD'::text,
  available_from date,
  notice_period text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  preferred_countries ARRAY,
  CONSTRAINT candidate_job_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT candidate_job_preferences_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profiles(id)
);
CREATE TABLE public.candidate_learning_roadmaps (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  candidate_id uuid NOT NULL UNIQUE,
  roadmap_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_job_ids ARRAY NOT NULL DEFAULT ARRAY[]::uuid[],
  total_skills_needed integer DEFAULT 0,
  total_time_estimate text,
  generated_date timestamp with time zone DEFAULT timezone('utc'::text, now()),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT candidate_learning_roadmaps_pkey PRIMARY KEY (id),
  CONSTRAINT candidate_learning_roadmaps_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profiles(id)
);
CREATE TABLE public.candidate_other_links (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  candidate_id uuid NOT NULL,
  platform text NOT NULL,
  url text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT candidate_other_links_pkey PRIMARY KEY (id),
  CONSTRAINT candidate_other_links_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profiles(id)
);
CREATE TABLE public.candidate_profiles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE,
  headline text,
  date_of_birth date,
  profile_type USER-DEFINED NOT NULL DEFAULT 'Professional'::profile_type,
  current_education_status text,
  expected_graduation_date date,
  years_of_experience text,
  current_job_title text,
  current_company text,
  country text NOT NULL,
  city text NOT NULL,
  willing_to_relocate boolean DEFAULT false,
  preferred_work_modes ARRAY,
  bio text,
  portfolio_website text,
  linkedin_url text,
  github_url text,
  behance_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  resume_file text,
  resume_filename text,
  resume_filetype text,
  CONSTRAINT candidate_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT candidate_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.candidate_projects (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  candidate_id uuid NOT NULL,
  project_title text NOT NULL,
  project_type USER-DEFINED NOT NULL,
  organization text,
  start_date date NOT NULL,
  end_date date,
  is_ongoing boolean DEFAULT false,
  description text NOT NULL,
  project_url text,
  technologies_used ARRAY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT candidate_projects_pkey PRIMARY KEY (id),
  CONSTRAINT candidate_projects_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profiles(id)
);
CREATE TABLE public.candidate_skills (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  candidate_id uuid NOT NULL,
  skill_name text NOT NULL,
  skill_level USER-DEFINED NOT NULL DEFAULT 'Beginner'::skill_level,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT candidate_skills_pkey PRIMARY KEY (id),
  CONSTRAINT candidate_skills_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profiles(id)
);
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  application_id uuid NOT NULL UNIQUE,
  recruiter_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  job_id uuid NOT NULL,
  is_initiated boolean DEFAULT false,
  initiated_by_recruiter boolean DEFAULT false,
  last_message_at timestamp with time zone,
  last_message_content text,
  recruiter_unread_count integer DEFAULT 0,
  candidate_unread_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.job_applications(id),
  CONSTRAINT conversations_recruiter_id_fkey FOREIGN KEY (recruiter_id) REFERENCES public.recruiter_profiles(id),
  CONSTRAINT conversations_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profiles(id),
  CONSTRAINT conversations_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id)
);
CREATE TABLE public.interested_jobs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  candidate_id uuid NOT NULL,
  job_id uuid NOT NULL,
  added_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT interested_jobs_pkey PRIMARY KEY (id),
  CONSTRAINT interested_jobs_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profiles(id),
  CONSTRAINT interested_jobs_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id)
);
CREATE TABLE public.job_applications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  job_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::application_status,
  cover_letter text,
  resume_url text,
  applied_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  reviewed_at timestamp with time zone,
  ai_analysis_score integer,
  ai_analysis_data jsonb,
  ai_analyzed_at timestamp with time zone,
  CONSTRAINT job_applications_pkey PRIMARY KEY (id),
  CONSTRAINT job_applications_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id),
  CONSTRAINT job_applications_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profiles(id)
);
CREATE TABLE public.job_skill_recommendations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  job_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_date timestamp with time zone DEFAULT timezone('utc'::text, now()),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT job_skill_recommendations_pkey PRIMARY KEY (id),
  CONSTRAINT job_skill_recommendations_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id),
  CONSTRAINT job_skill_recommendations_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profiles(id)
);
CREATE TABLE public.job_skills (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  job_id uuid NOT NULL,
  skill_name text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT job_skills_pkey PRIMARY KEY (id),
  CONSTRAINT job_skills_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id)
);
CREATE TABLE public.jobs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  recruiter_id uuid NOT NULL,
  job_title text NOT NULL,
  department text,
  job_type USER-DEFINED NOT NULL,
  work_mode USER-DEFINED NOT NULL,
  experience_level USER-DEFINED NOT NULL,
  country text NOT NULL,
  city text NOT NULL,
  address text,
  salary_min integer,
  salary_max integer,
  salary_currency text DEFAULT 'USD'::text,
  salary_period text,
  job_description text NOT NULL,
  responsibilities text NOT NULL,
  qualifications text NOT NULL,
  nice_to_have text,
  benefits text,
  application_deadline date,
  number_of_positions integer DEFAULT 1,
  is_student_friendly boolean DEFAULT false,
  minimum_experience_years integer,
  status USER-DEFINED NOT NULL DEFAULT 'draft'::job_status,
  view_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  save_count integer DEFAULT 0,
  CONSTRAINT jobs_pkey PRIMARY KEY (id),
  CONSTRAINT jobs_recruiter_id_fkey FOREIGN KEY (recruiter_id) REFERENCES public.recruiter_profiles(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL,
  sender_type USER-DEFINED NOT NULL,
  sender_id uuid NOT NULL,
  message_type USER-DEFINED NOT NULL DEFAULT 'text'::message_type,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id)
);
CREATE TABLE public.professional_headshots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL,
  original_image_url text NOT NULL,
  generated_image_url text NOT NULL,
  style character varying NOT NULL CHECK (style::text = ANY (ARRAY['formal'::character varying, 'linkedin'::character varying, 'corporate'::character varying, 'casual_professional'::character varying]::text[])),
  prompt text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT professional_headshots_pkey PRIMARY KEY (id),
  CONSTRAINT professional_headshots_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profiles(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  role USER-DEFINED NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone_number text,
  profile_picture_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.recruiter_profiles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE,
  company_name text NOT NULL,
  company_logo_url text,
  company_website text,
  company_size text,
  industry text,
  company_description text,
  country text NOT NULL,
  city text NOT NULL,
  address text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT recruiter_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT recruiter_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.saved_jobs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  candidate_id uuid NOT NULL,
  job_id uuid NOT NULL,
  saved_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT saved_jobs_pkey PRIMARY KEY (id),
  CONSTRAINT saved_jobs_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profiles(id),
  CONSTRAINT saved_jobs_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id)
);
CREATE TABLE public.skill_verification_attempts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  exam_id uuid NOT NULL,
  unverified_skill_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  score integer NOT NULL DEFAULT 0,
  total_marks integer NOT NULL DEFAULT 10,
  passed boolean NOT NULL DEFAULT false,
  started_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  submitted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT skill_verification_attempts_pkey PRIMARY KEY (id),
  CONSTRAINT skill_verification_attempts_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.skill_verification_exams(id),
  CONSTRAINT skill_verification_attempts_unverified_skill_id_fkey FOREIGN KEY (unverified_skill_id) REFERENCES public.unverified_skills(id),
  CONSTRAINT skill_verification_attempts_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profiles(id)
);
CREATE TABLE public.skill_verification_exams (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  unverified_skill_id uuid NOT NULL,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_marks integer NOT NULL DEFAULT 10,
  passing_marks integer NOT NULL DEFAULT 7,
  skill_name text NOT NULL,
  skill_level text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  expires_at timestamp with time zone,
  CONSTRAINT skill_verification_exams_pkey PRIMARY KEY (id),
  CONSTRAINT skill_verification_exams_unverified_skill_id_fkey FOREIGN KEY (unverified_skill_id) REFERENCES public.unverified_skills(id)
);
CREATE TABLE public.unverified_skills (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  candidate_id uuid NOT NULL,
  skill_name text NOT NULL,
  skill_level text NOT NULL DEFAULT 'Beginner'::text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unverified_skills_pkey PRIMARY KEY (id),
  CONSTRAINT unverified_skills_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidate_profiles(id)
);
CREATE TABLE public.video_calls (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  channel_name character varying NOT NULL,
  initiated_by uuid NOT NULL,
  status character varying NOT NULL DEFAULT 'pending'::character varying,
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  duration_seconds integer,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  scheduled_at timestamp with time zone,
  scheduled_by uuid,
  interview_title character varying,
  interview_description text,
  CONSTRAINT video_calls_pkey PRIMARY KEY (id),
  CONSTRAINT video_calls_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id),
  CONSTRAINT video_calls_initiated_by_fkey FOREIGN KEY (initiated_by) REFERENCES public.profiles(id),
  CONSTRAINT video_calls_scheduled_by_fkey FOREIGN KEY (scheduled_by) REFERENCES public.profiles(id)
);