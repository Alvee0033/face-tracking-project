--
-- PostgreSQL database dump
--


-- Dumped from database version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', 'public, extensions', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions ;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--




--
-- Name: applications_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.applications_status_enum AS ENUM (
    'pending',
    'reviewed',
    'shortlisted',
    'interview_scheduled',
    'hired',
    'rejected'
);




--
-- Name: interviews_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.interviews_status_enum AS ENUM (
    'scheduled',
    'completed',
    'cancelled',
    'no_show'
);




--
-- Name: jobs_experiencelevel_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.jobs_experiencelevel_enum AS ENUM (
    'entry',
    'mid',
    'senior',
    'lead',
    'executive'
);




--
-- Name: jobs_jobtype_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.jobs_jobtype_enum AS ENUM (
    'full-time',
    'part-time',
    'contract',
    'internship',
    'remote',
    'hybrid',
    'freelance',
    'campus-placement'
);




--
-- Name: jobs_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.jobs_status_enum AS ENUM (
    'open',
    'closed',
    'paused'
);




--
-- Name: jobs_workmode_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.jobs_workmode_enum AS ENUM (
    'remote',
    'on-site',
    'hybrid'
);




--
-- Name: users_role_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.users_role_enum AS ENUM (
    'candidate',
    'recruiter',
    'admin'
);




SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_interviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_interviews (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    "userId" uuid NOT NULL,
    "jobTitle" character varying,
    "jobDescription" character varying,
    "isCompleted" boolean DEFAULT false NOT NULL,
    "overallScore" double precision,
    questions jsonb,
    answers jsonb,
    feedback jsonb,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);




--
-- Name: applications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.applications (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    "candidateId" uuid NOT NULL,
    "jobId" uuid NOT NULL,
    status public.applications_status_enum DEFAULT 'pending'::public.applications_status_enum NOT NULL,
    "coverLetter" text,
    "resumeUrl" character varying,
    "aiScore" double precision,
    "aiAnalysisData" jsonb,
    "aiAnalyzedAt" timestamp without time zone,
    "recruiterNotes" text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);




--
-- Name: candidate_education; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.candidate_education (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    "candidateProfileId" character varying NOT NULL,
    degree character varying NOT NULL,
    "fieldOfStudy" character varying NOT NULL,
    institution character varying NOT NULL,
    "startDate" character varying,
    "endDate" character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);




--
-- Name: candidate_experience; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.candidate_experience (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    "candidateProfileId" character varying NOT NULL,
    "jobTitle" character varying NOT NULL,
    company character varying NOT NULL,
    description text,
    "startDate" character varying,
    "endDate" character varying,
    "isCurrent" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);




--
-- Name: candidate_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.candidate_profiles (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    "userId" uuid NOT NULL,
    headline character varying,
    bio text,
    country character varying,
    city character varying,
    "currentJobTitle" character varying,
    "currentCompany" character varying,
    "yearsOfExperience" integer,
    "portfolioWebsite" character varying,
    "linkedinUrl" character varying,
    "githubUrl" character varying,
    "resumeUrl" character varying,
    "resumeText" text,
    "willingToRelocate" boolean DEFAULT false NOT NULL,
    "preferredWorkModes" text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);




--
-- Name: candidate_skills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.candidate_skills (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    "candidateProfileId" character varying NOT NULL,
    "skillName" character varying NOT NULL,
    "skillLevel" character varying DEFAULT 'intermediate'::character varying NOT NULL,
    "isVerified" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);




--
-- Name: community_posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.community_posts (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    "authorId" uuid NOT NULL,
    title character varying,
    content text NOT NULL,
    category character varying,
    "likeCount" integer DEFAULT 0 NOT NULL,
    "replyCount" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "imageUrl" character varying
);




--
-- Name: community_replies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.community_replies (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    "postId" character varying NOT NULL,
    "authorId" uuid NOT NULL,
    content text NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);




--
-- Name: conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversations (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    "recruiterId" uuid NOT NULL,
    "candidateId" uuid NOT NULL,
    "jobId" character varying,
    "lastMessageAt" timestamp without time zone,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);




--
-- Name: interviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.interviews (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    "recruiterId" uuid NOT NULL,
    "candidateId" uuid NOT NULL,
    "applicationId" uuid,
    "scheduledAt" timestamp without time zone NOT NULL,
    status public.interviews_status_enum DEFAULT 'scheduled'::public.interviews_status_enum NOT NULL,
    title character varying,
    description text,
    "meetingLink" character varying,
    "channelName" character varying,
    notes text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);




--
-- Name: jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.jobs (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    "recruiterId" uuid NOT NULL,
    title character varying NOT NULL,
    description text NOT NULL,
    requirements text,
    responsibilities text,
    company character varying,
    "companyLogo" character varying,
    location character varying,
    country character varying,
    "jobType" public.jobs_jobtype_enum DEFAULT 'full-time'::public.jobs_jobtype_enum NOT NULL,
    status public.jobs_status_enum DEFAULT 'open'::public.jobs_status_enum NOT NULL,
    "experienceLevel" public.jobs_experiencelevel_enum,
    "educationLevel" character varying,
    "salaryMin" integer,
    "salaryMax" integer,
    "salaryCurrency" character varying,
    "requiredSkills" text,
    "preferredSkills" text,
    "applicationDeadline" character varying,
    "viewCount" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    category character varying,
    "workMode" public.jobs_workmode_enum DEFAULT 'on-site'::public.jobs_workmode_enum NOT NULL
);




--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    "conversationId" character varying NOT NULL,
    "senderId" uuid NOT NULL,
    content text NOT NULL,
    "attachmentUrl" character varying,
    "isRead" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);




--
-- Name: recruiter_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recruiter_profiles (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    "userId" uuid NOT NULL,
    "companyName" character varying,
    "companyLogoUrl" character varying,
    "companyWebsite" character varying,
    "companySize" character varying,
    industry character varying,
    "companyDescription" text,
    "position" character varying,
    country character varying,
    city character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);




--
-- Name: saved_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.saved_jobs (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    "userId" uuid NOT NULL,
    "jobId" character varying NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    type character varying DEFAULT 'saved'::character varying NOT NULL
);




--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    email character varying NOT NULL,
    password character varying NOT NULL,
    "fullName" character varying NOT NULL,
    role public.users_role_enum DEFAULT 'candidate'::public.users_role_enum NOT NULL,
    "phoneNumber" character varying,
    "profilePictureUrl" character varying,
    "isActive" boolean DEFAULT true NOT NULL,
    "isEmailVerified" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);




--
-- Name: messages PK_18325f38ae6de43878487eff986; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY (id);


--
-- Name: saved_jobs PK_1e106c66fc89f96addc57f71fb0; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_jobs
    ADD CONSTRAINT "PK_1e106c66fc89f96addc57f71fb0" PRIMARY KEY (id);


--
-- Name: recruiter_profiles PK_5324ae181a3874c303eb1b5280b; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recruiter_profiles
    ADD CONSTRAINT "PK_5324ae181a3874c303eb1b5280b" PRIMARY KEY (id);


--
-- Name: candidate_education PK_86bda616ec3ad179c94236988fd; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidate_education
    ADD CONSTRAINT "PK_86bda616ec3ad179c94236988fd" PRIMARY KEY (id);


--
-- Name: candidate_profiles PK_8e8cf5b54118601673585218cc4; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidate_profiles
    ADD CONSTRAINT "PK_8e8cf5b54118601673585218cc4" PRIMARY KEY (id);


--
-- Name: applications PK_938c0a27255637bde919591888f; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT "PK_938c0a27255637bde919591888f" PRIMARY KEY (id);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: community_posts PK_af0c0b33e03b933e3e48119f2e3; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_posts
    ADD CONSTRAINT "PK_af0c0b33e03b933e3e48119f2e3" PRIMARY KEY (id);


--
-- Name: community_replies PK_b49890b4eacf6ab097a1611e9a3; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_replies
    ADD CONSTRAINT "PK_b49890b4eacf6ab097a1611e9a3" PRIMARY KEY (id);


--
-- Name: ai_interviews PK_b6c286cdb51291a7b677ff52938; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_interviews
    ADD CONSTRAINT "PK_b6c286cdb51291a7b677ff52938" PRIMARY KEY (id);


--
-- Name: jobs PK_cf0a6c42b72fcc7f7c237def345; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT "PK_cf0a6c42b72fcc7f7c237def345" PRIMARY KEY (id);


--
-- Name: candidate_experience PK_dd2f56a39a8ba6815ce7a55a972; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidate_experience
    ADD CONSTRAINT "PK_dd2f56a39a8ba6815ce7a55a972" PRIMARY KEY (id);


--
-- Name: candidate_skills PK_e1bb466425868a6a6169ee0ee8f; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidate_skills
    ADD CONSTRAINT "PK_e1bb466425868a6a6169ee0ee8f" PRIMARY KEY (id);


--
-- Name: conversations PK_ee34f4f7ced4ec8681f26bf04ef; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT "PK_ee34f4f7ced4ec8681f26bf04ef" PRIMARY KEY (id);


--
-- Name: interviews PK_fd41af1f96d698fa33c2f070f47; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.interviews
    ADD CONSTRAINT "PK_fd41af1f96d698fa33c2f070f47" PRIMARY KEY (id);


--
-- Name: recruiter_profiles REL_ca24c92565dce0e06bb3b2a039; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recruiter_profiles
    ADD CONSTRAINT "REL_ca24c92565dce0e06bb3b2a039" UNIQUE ("userId");


--
-- Name: candidate_profiles REL_df5454fe06a1630d3ba903a95d; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidate_profiles
    ADD CONSTRAINT "REL_df5454fe06a1630d3ba903a95d" UNIQUE ("userId");


--
-- Name: users UQ_97672ac88f789774dd47f7c8be3; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);


--
-- Name: saved_jobs FK_07d13bb446cd7fc577209d65265; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_jobs
    ADD CONSTRAINT "FK_07d13bb446cd7fc577209d65265" FOREIGN KEY ("userId") REFERENCES public.users(id);


--
-- Name: messages FK_2db9cf2b3ca111742793f6c37ce; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT "FK_2db9cf2b3ca111742793f6c37ce" FOREIGN KEY ("senderId") REFERENCES public.users(id);


--
-- Name: conversations FK_43f7c430922508580245eb324af; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT "FK_43f7c430922508580245eb324af" FOREIGN KEY ("candidateId") REFERENCES public.users(id);


--
-- Name: conversations FK_50893e0cb291621fe8c2e151ab9; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT "FK_50893e0cb291621fe8c2e151ab9" FOREIGN KEY ("recruiterId") REFERENCES public.users(id);


--
-- Name: community_posts FK_7c9e434b072122306431dc28d9c; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_posts
    ADD CONSTRAINT "FK_7c9e434b072122306431dc28d9c" FOREIGN KEY ("authorId") REFERENCES public.users(id);


--
-- Name: jobs FK_80472a2d1a7369d39f241c5f5f2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT "FK_80472a2d1a7369d39f241c5f5f2" FOREIGN KEY ("recruiterId") REFERENCES public.users(id);


--
-- Name: interviews FK_9b47fb5a4e06ccb14d20d2f06fd; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.interviews
    ADD CONSTRAINT "FK_9b47fb5a4e06ccb14d20d2f06fd" FOREIGN KEY ("candidateId") REFERENCES public.users(id);


--
-- Name: applications FK_a34254e3f2b3d20f07f8dbd6322; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT "FK_a34254e3f2b3d20f07f8dbd6322" FOREIGN KEY ("candidateId") REFERENCES public.users(id);


--
-- Name: community_replies FK_a6ad9999f146e80d1d8aaa08e3c; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_replies
    ADD CONSTRAINT "FK_a6ad9999f146e80d1d8aaa08e3c" FOREIGN KEY ("authorId") REFERENCES public.users(id);


--
-- Name: ai_interviews FK_b149ad532ccd51eba4e6d045ffc; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_interviews
    ADD CONSTRAINT "FK_b149ad532ccd51eba4e6d045ffc" FOREIGN KEY ("userId") REFERENCES public.users(id);


--
-- Name: interviews FK_ba82c76bf124871821aedc35b7a; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.interviews
    ADD CONSTRAINT "FK_ba82c76bf124871821aedc35b7a" FOREIGN KEY ("applicationId") REFERENCES public.applications(id);


--
-- Name: recruiter_profiles FK_ca24c92565dce0e06bb3b2a039e; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recruiter_profiles
    ADD CONSTRAINT "FK_ca24c92565dce0e06bb3b2a039e" FOREIGN KEY ("userId") REFERENCES public.users(id);


--
-- Name: interviews FK_d0757615c93f97a15702d673bc5; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.interviews
    ADD CONSTRAINT "FK_d0757615c93f97a15702d673bc5" FOREIGN KEY ("recruiterId") REFERENCES public.users(id);


--
-- Name: candidate_profiles FK_df5454fe06a1630d3ba903a95d8; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidate_profiles
    ADD CONSTRAINT "FK_df5454fe06a1630d3ba903a95d8" FOREIGN KEY ("userId") REFERENCES public.users(id);


--
-- Name: applications FK_f6ebb8bc5061068e4dd97df3c77; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT "FK_f6ebb8bc5061068e4dd97df3c77" FOREIGN KEY ("jobId") REFERENCES public.jobs(id);


--
-- PostgreSQL database dump complete
--


