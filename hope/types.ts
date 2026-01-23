export enum Status {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  LISTENING = 'LISTENING',
  SPEAKING = 'SPEAKING',
  ERROR = 'ERROR',
}

export interface TranscriptEntry {
  speaker: 'You' | 'Hope';
  text: string;
}

// CareerBot Types
export interface CareerBotMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface UserProfile {
  id: string;
  full_name?: string;
  email?: string;
  headline?: string;
  years_of_experience?: string;
  current_job_title?: string;
  current_company?: string;
  country?: string;
  city?: string;
  bio?: string;
}

export interface UserSkill {
  id: string;
  skill_name: string;
  skill_level: string;
}

export interface UserExperience {
  id: string;
  experience_type: string;
  job_title: string;
  company: string;
  location?: string;
  start_date: string;
  end_date?: string;
  is_current: boolean;
  description?: string;
}

export interface UserEducation {
  id: string;
  education_type: string;
  degree: string;
  field_of_study: string;
  institution: string;
  start_date: string;
  end_date?: string;
  is_current: boolean;
  grade?: string;
}

export interface JobPreferences {
  looking_for?: string[];
  preferred_roles?: string[];
  preferred_countries?: string[];
  expected_salary_min?: number;
  expected_salary_max?: number;
  salary_currency?: string;
  available_from?: string;
  notice_period?: string;
}

export interface AvailableJob {
  id: string;
  job_title: string;
  experience_level: string;
  work_mode: string;
  job_type: string;
  country: string;
  city: string;
  company_name?: string;
  recruiter_id: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
}

export interface UserContext {
  profile?: UserProfile;
  skills?: UserSkill[];
  experience?: UserExperience[];
  education?: UserEducation[];
  jobPreferences?: JobPreferences;
  availableJobs?: AvailableJob[];
}
