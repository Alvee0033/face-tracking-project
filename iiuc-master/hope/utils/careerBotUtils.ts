import { UserContext, UserProfile, UserSkill, UserExperience, UserEducation, JobPreferences, AvailableJob } from '../types';

/**
 * Fetch user context including profile, skills, experience, education, and available jobs
 * This is a mock implementation. In a real app, this would fetch from your backend API.
 */
export async function fetchUserContext(userId: string): Promise<UserContext> {
  try {
    // In a real implementation, you would make API calls to your backend
    // For now, this returns mock data or makes calls to your backend endpoints
    
    // Example API calls (adjust URLs based on your backend):
    const baseURL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api';
    
    // Fetch user profile
    const profileResponse = await fetch(`${baseURL}/profiles/candidate/${userId}`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });
    
    if (!profileResponse.ok) {
      throw new Error('Failed to fetch user profile');
    }
    
    const profileData = await profileResponse.json();
    
    // Fetch available jobs
    const jobsResponse = await fetch(`${baseURL}/jobs?limit=20`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });
    
    const jobsData = await jobsResponse.json();
    
    // Build user context
    const context: UserContext = {
      profile: mapProfileData(profileData),
      skills: profileData.skills || [],
      experience: profileData.experience || [],
      education: profileData.education || [],
      jobPreferences: profileData.jobPreferences,
      availableJobs: jobsData.jobs || [],
    };
    
    return context;
  } catch (error) {
    console.error('Error fetching user context:', error);
    // Return empty context on error
    return {};
  }
}

/**
 * Get authentication token from localStorage or session
 */
function getAuthToken(): string {
  // Implement based on your auth system
  return localStorage.getItem('authToken') || '';
}

/**
 * Map profile data to UserProfile type
 */
function mapProfileData(data: any): UserProfile | undefined {
  if (!data || !data.profile) return undefined;
  
  const profile = data.profile;
  const candidateProfile = data.candidateProfile;
  
  return {
    id: profile.id,
    full_name: profile.full_name,
    email: profile.email,
    headline: candidateProfile?.headline,
    years_of_experience: candidateProfile?.years_of_experience,
    current_job_title: candidateProfile?.current_job_title,
    current_company: candidateProfile?.current_company,
    country: candidateProfile?.country,
    city: candidateProfile?.city,
    bio: candidateProfile?.bio,
  };
}

/**
 * Mock function to generate sample user context for demo purposes
 * Use this when user is not authenticated
 */
export function generateMockUserContext(): UserContext {
  return {
    profile: {
      id: 'demo-user',
      full_name: 'Demo User',
      headline: 'Aspiring Software Developer',
      years_of_experience: '1-2 years',
      current_job_title: 'Junior Developer',
      current_company: 'Tech Startup',
      country: 'Bangladesh',
      city: 'Dhaka',
      bio: 'Passionate about web development and learning new technologies.',
    },
    skills: [
      { id: '1', skill_name: 'JavaScript', skill_level: 'Intermediate' },
      { id: '2', skill_name: 'React', skill_level: 'Intermediate' },
      { id: '3', skill_name: 'Node.js', skill_level: 'Beginner' },
      { id: '4', skill_name: 'TypeScript', skill_level: 'Beginner' },
    ],
    experience: [
      {
        id: '1',
        experience_type: 'Internship',
        job_title: 'Frontend Developer Intern',
        company: 'Tech Startup',
        location: 'Dhaka, Bangladesh',
        start_date: '2023-06-01',
        is_current: true,
        description: 'Working on web applications using React and TypeScript',
      },
    ],
    education: [
      {
        id: '1',
        education_type: 'Undergraduate',
        degree: "Bachelor's in Computer Science",
        field_of_study: 'Computer Science',
        institution: 'International Islamic University Chittagong',
        start_date: '2020-01-01',
        is_current: true,
        grade: '3.5',
      },
    ],
    jobPreferences: {
      looking_for: ['Full-time', 'Internship'],
      preferred_roles: ['Software Developer', 'Frontend Developer', 'Backend Developer'],
      expected_salary_min: 20000,
      expected_salary_max: 40000,
      salary_currency: 'BDT',
    },
    availableJobs: [
      {
        id: '1',
        job_title: 'Junior Frontend Developer',
        experience_level: 'Entry Level',
        work_mode: 'Remote',
        job_type: 'Full-time',
        country: 'Bangladesh',
        city: 'Dhaka',
        company_name: 'Tech Solutions Ltd.',
        recruiter_id: 'recruiter-1',
        salary_min: 25000,
        salary_max: 35000,
        salary_currency: 'BDT',
      },
      {
        id: '2',
        job_title: 'Backend Developer Intern',
        experience_level: 'Entry Level',
        work_mode: 'Hybrid',
        job_type: 'Internship',
        country: 'Bangladesh',
        city: 'Chittagong',
        company_name: 'StartupHub',
        recruiter_id: 'recruiter-2',
      },
      {
        id: '3',
        job_title: 'Full Stack Developer',
        experience_level: 'Mid Level',
        work_mode: 'On-site',
        job_type: 'Full-time',
        country: 'Bangladesh',
        city: 'Dhaka',
        company_name: 'Digital Agency Co.',
        recruiter_id: 'recruiter-3',
        salary_min: 40000,
        salary_max: 60000,
        salary_currency: 'BDT',
      },
    ],
  };
}

/**
 * Format job context for AI prompt
 */
export function formatJobsForPrompt(jobs: AvailableJob[]): string {
  return jobs
    .slice(0, 10) // Limit to 10 jobs to avoid token limits
    .map((job, index) => {
      const salary = job.salary_min && job.salary_max 
        ? `${job.salary_currency} ${job.salary_min} - ${job.salary_max}`
        : 'Salary not disclosed';
      
      return `${index + 1}. ${job.job_title}
   - Experience: ${job.experience_level}
   - Type: ${job.job_type} (${job.work_mode})
   - Location: ${job.city}, ${job.country}
   - Company: ${job.company_name || 'Company name not disclosed'}
   - Salary: ${salary}`;
    })
    .join('\n\n');
}

/**
 * Format skills for AI prompt
 */
export function formatSkillsForPrompt(skills: UserSkill[]): string {
  return skills
    .map(skill => `${skill.skill_name} (${skill.skill_level})`)
    .join(', ');
}

/**
 * Analyze skill gaps between user skills and job requirements
 */
export function analyzeSkillGaps(
  userSkills: UserSkill[],
  targetRole: string
): { hasSkills: string[]; missingSkills: string[]; recommendations: string[] } {
  // This is a simplified version. In a real implementation,
  // you would use AI or a comprehensive skills database
  
  const roleSkillMap: Record<string, string[]> = {
    'backend developer': ['Node.js', 'Python', 'SQL', 'API Development', 'Docker'],
    'frontend developer': ['JavaScript', 'React', 'HTML', 'CSS', 'TypeScript'],
    'full stack developer': ['JavaScript', 'React', 'Node.js', 'SQL', 'API Development'],
    'data scientist': ['Python', 'Machine Learning', 'Statistics', 'SQL', 'Data Visualization'],
    'mobile developer': ['React Native', 'Flutter', 'Kotlin', 'Swift', 'Mobile UI'],
  };
  
  const normalizedRole = targetRole.toLowerCase();
  const requiredSkills = roleSkillMap[normalizedRole] || [];
  const userSkillNames = userSkills.map(s => s.skill_name.toLowerCase());
  
  const hasSkills = requiredSkills.filter(skill => 
    userSkillNames.some(userSkill => userSkill.includes(skill.toLowerCase()))
  );
  
  const missingSkills = requiredSkills.filter(skill => 
    !userSkillNames.some(userSkill => userSkill.includes(skill.toLowerCase()))
  );
  
  const recommendations = missingSkills.map(skill => 
    `Learn ${skill} through online courses or practice projects`
  );
  
  return { hasSkills, missingSkills, recommendations };
}
