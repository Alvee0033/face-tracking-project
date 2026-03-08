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

export interface User {
  id: string;
  full_name?: string;
  headline?: string;
  about?: string;
  [key: string]: any;
}

export interface UserSkill {
  user_id: string;
  skill_name: string;
  skill_level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
}

export interface UserExperience {
  user_id: string;
  job_title: string;
  company_name: string;
  start_date: string;
  end_date?: string;
  description?: string;
}

export interface UserEducation {
  user_id: string;
  institution: string;
  degree: string;
  field_of_study: string;
  graduation_year: number;
}

export interface Job {
  job_title: string;
  company_name: string;
}

export interface SavedJob {
  user_id: string;
  job_id: string;
  jobs?: Job;
}
