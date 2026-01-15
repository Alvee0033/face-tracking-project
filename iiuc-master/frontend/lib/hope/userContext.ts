import api from '../api';
import { User, UserSkill, UserExperience, UserEducation, SavedJob } from './types';

export interface UserContext {
  user: User | null;
  profile: any;
  skills: UserSkill[];
  experiences: UserExperience[];
  educations: UserEducation[];
  savedJobs: any[];
  interestedJobs: any[];
  roadmap: any;
  availableJobs: any[];
  jobPreferences: any;
}

export async function fetchUserContext(): Promise<UserContext> {
  try {
    // Fetch all user context data in parallel
    const [
      profileRes,
      savedJobsRes,
      interestedJobsRes,
      roadmapRes,
      allJobsRes,
    ] = await Promise.all([
      api.get('/cv/profile'),
      api.get('/saved-jobs/saved'),
      api.get('/saved-jobs/interested'),
      api.get('/saved-jobs/roadmap'),
      api.get('/jobs', { params: { limit: 50, status: 'open' } }), // Get top 50 available open jobs
    ]);

    const profileData = profileRes.data;
    const profile = profileData.profile || {};

    return {
      user: {
        id: profile.id || '',
        full_name: profile.full_name || profile.name || '',
        headline: profile.headline || '',
        about: profile.bio || '',
      },
      profile: {
        ...profile,
        headline: profile.headline,
        summary: profile.bio,
        current_job_title: profile.current_job_title,
        current_company: profile.current_company,
        years_of_experience: profile.years_of_experience,
        job_preferences: profile.job_preferences,
      },
      skills: profileData.skills || [],
      experiences: profileData.experience || [],
      educations: profileData.education || [],
      savedJobs: savedJobsRes.data.savedJobs || [],
      // Flatten interested jobs structure (jobs field contains the actual job data)
      interestedJobs: (interestedJobsRes.data.interestedJobs || []).map((item: any) => ({
        ...item.jobs,
        added_at: item.added_at,
        company_name: item.jobs?.recruiter_profiles?.company_name,
        company_logo_url: item.jobs?.recruiter_profiles?.company_logo_url
      })),
      roadmap: roadmapRes.data.roadmap || null,
      availableJobs: allJobsRes.data.jobs || [],
      jobPreferences: profile.job_preferences || null,
    };
  } catch (error) {
    console.error('Error fetching user context:', error);
    return {
      user: null,
      profile: null,
      skills: [],
      experiences: [],
      educations: [],
      savedJobs: [],
      interestedJobs: [],
      roadmap: null,
      availableJobs: [],
      jobPreferences: null,
    };
  }
}

export function formatUserContextForPrompt(context: UserContext): string {
  let prompt = "You are Hope, a compassionate, context-aware AI career assistant. You have access to the user's complete professional profile. Use this information to provide highly personalized career advice, job recommendations, and support.\n\n";

  // User Profile
  if (context.user) {
    prompt += `=== USER PROFILE ===\n`;
    prompt += `Name: ${context.user.full_name || 'Not provided'}\n`;
    if (context.profile?.headline) {
      prompt += `Professional Headline: ${context.profile.headline}\n`;
    }
    if (context.profile?.current_job_title) {
      prompt += `Current Position: ${context.profile.current_job_title}`;
      if (context.profile.current_company) {
        prompt += ` at ${context.profile.current_company}`;
      }
      prompt += `\n`;
    }
    if (context.profile?.years_of_experience) {
      prompt += `Years of Experience: ${context.profile.years_of_experience}\n`;
    }
    if (context.profile?.bio) {
      prompt += `Professional Summary: ${context.profile.bio}\n`;
    }
    prompt += `\n`;
  }

  // Skills
  if (context.skills.length > 0) {
    prompt += `=== SKILLS (${context.skills.length} total) ===\n`;
    const verifiedSkills = context.skills.filter((s: any) => s.is_verified);
    const unverifiedSkills = context.skills.filter((s: any) => !s.is_verified);
    
    if (verifiedSkills.length > 0) {
      prompt += `Verified Skills:\n`;
      verifiedSkills.forEach((s: any) => {
        prompt += `  • ${s.skill_name} - ${s.skill_level} level`;
        if (s.years_of_experience) {
          prompt += ` (${s.years_of_experience} years)`;
        }
        prompt += `\n`;
      });
    }
    if (unverifiedSkills.length > 0) {
      prompt += `Skills in Development:\n`;
      unverifiedSkills.forEach((s: any) => {
        prompt += `  • ${s.skill_name} - ${s.skill_level} level\n`;
      });
    }
    prompt += `\n`;
  }

  // Work Experience
  if (context.experiences.length > 0) {
    prompt += `=== WORK EXPERIENCE (${context.experiences.length} positions) ===\n`;
    context.experiences.forEach((exp: any, index: number) => {
      prompt += `${index + 1}. ${exp.job_title} at ${exp.company_name}\n`;
      prompt += `   Duration: ${exp.start_date} to ${exp.end_date || 'Present'}`;
      if (exp.location) {
        prompt += ` | Location: ${exp.location}`;
      }
      prompt += `\n`;
      if (exp.description) {
        prompt += `   Description: ${exp.description}\n`;
      }
      if (exp.responsibilities) {
        prompt += `   Key Responsibilities: ${exp.responsibilities}\n`;
      }
      prompt += `\n`;
    });
  }

  // Education
  if (context.educations.length > 0) {
    prompt += `=== EDUCATION ===\n`;
    context.educations.forEach((edu: any, index: number) => {
      prompt += `${index + 1}. ${edu.degree}`;
      if (edu.field_of_study) {
        prompt += ` in ${edu.field_of_study}`;
      }
      prompt += `\n`;
      prompt += `   Institution: ${edu.institution}\n`;
      if (edu.start_date && edu.end_date) {
        prompt += `   Duration: ${edu.start_date} to ${edu.end_date}\n`;
      }
      if (edu.grade) {
        prompt += `   Grade/GPA: ${edu.grade}\n`;
      }
      prompt += `\n`;
    });
  }

  // Job Preferences
  if (context.profile?.job_preferences) {
    const prefs = context.profile.job_preferences;
    prompt += `=== JOB PREFERENCES & CAREER GOALS ===\n`;
    if (prefs.desired_job_titles?.length > 0) {
      prompt += `Desired Job Titles: ${prefs.desired_job_titles.join(', ')}\n`;
    }
    if (prefs.preferred_locations?.length > 0) {
      prompt += `Preferred Locations: ${prefs.preferred_locations.join(', ')}\n`;
    }
    if (prefs.job_types?.length > 0) {
      prompt += `Job Types: ${prefs.job_types.join(', ')}\n`;
    }
    if (prefs.work_modes?.length > 0) {
      prompt += `Work Modes: ${prefs.work_modes.join(', ')}\n`;
    }
    if (prefs.expected_salary_min || prefs.expected_salary_max) {
      prompt += `Expected Salary Range: ${prefs.salary_currency || 'BDT'} ${prefs.expected_salary_min || '0'} - ${prefs.expected_salary_max || 'Negotiable'}\n`;
    }
    prompt += `\n`;
  }

  // Saved Jobs
  if (context.savedJobs.length > 0) {
    prompt += `=== SAVED JOBS (${context.savedJobs.length} jobs) ===\n`;
    prompt += `The user has bookmarked these jobs for later review:\n`;
    context.savedJobs.slice(0, 10).forEach((job: any, index: number) => {
      prompt += `${index + 1}. ${job.job_title} at ${job.company_name || 'Company not disclosed'}\n`;
      prompt += `   Location: ${job.city}, ${job.country} | Mode: ${job.work_mode} | Level: ${job.experience_level}\n`;
      if (job.job_type) {
        prompt += `   Type: ${job.job_type}`;
      }
      if (job.salary_min && job.salary_max) {
        prompt += ` | Salary: ${job.salary_currency} ${job.salary_min} - ${job.salary_max}`;
      }
      prompt += `\n`;
      
      // Detailed job information
      if (job.job_description) {
        const desc = job.job_description.length > 200 ? job.job_description.substring(0, 200) + '...' : job.job_description;
        prompt += `   📄 Description: ${desc}\n`;
      }
      if (job.responsibilities) {
        const resp = job.responsibilities.length > 150 ? job.responsibilities.substring(0, 150) + '...' : job.responsibilities;
        prompt += `   📋 Responsibilities: ${resp}\n`;
      }
      if (job.required_qualifications) {
        const reqQual = job.required_qualifications.length > 150 ? job.required_qualifications.substring(0, 150) + '...' : job.required_qualifications;
        prompt += `   ✅ Required Qualifications: ${reqQual}\n`;
      }
      if (job.preferred_qualifications) {
        const prefQual = job.preferred_qualifications.length > 100 ? job.preferred_qualifications.substring(0, 100) + '...' : job.preferred_qualifications;
        prompt += `   ⭐ Preferred Qualifications: ${prefQual}\n`;
      }
      if (job.required_skills?.length > 0) {
        prompt += `   🎯 Required Skills: ${job.required_skills.slice(0, 10).join(', ')}\n`;
      }
      if (job.benefits?.length > 0) {
        prompt += `   💼 Benefits: ${job.benefits.join(', ')}\n`;
      }
      prompt += `\n`;
    });
    if (context.savedJobs.length > 10) {
      prompt += `   ... and ${context.savedJobs.length - 10} more saved jobs\n`;
    }
    prompt += `\n`;
  }

  // Interested Jobs
  if (context.interestedJobs.length > 0) {
    prompt += `=== JOBS OF INTEREST (${context.interestedJobs.length} jobs - HIGH PRIORITY) ===\n`;
    prompt += `The user is actively interested in applying to these positions:\n`;
    context.interestedJobs.slice(0, 10).forEach((job: any, index: number) => {
      prompt += `${index + 1}. ${job.job_title} at ${job.company_name || 'Company not disclosed'}\n`;
      prompt += `   Location: ${job.city}, ${job.country} | Mode: ${job.work_mode} | Level: ${job.experience_level}\n`;
      if (job.job_type) {
        prompt += `   Type: ${job.job_type}`;
      }
      if (job.salary_min && job.salary_max) {
        prompt += ` | Salary: ${job.salary_currency} ${job.salary_min} - ${job.salary_max}`;
      }
      prompt += `\n`;
      
      // Detailed job information for interested jobs (more detail since they're actively interested)
      if (job.job_description) {
        const desc = job.job_description.length > 300 ? job.job_description.substring(0, 300) + '...' : job.job_description;
        prompt += `   📄 Full Description: ${desc}\n`;
      }
      if (job.responsibilities) {
        const resp = job.responsibilities.length > 250 ? job.responsibilities.substring(0, 250) + '...' : job.responsibilities;
        prompt += `   📋 Key Responsibilities: ${resp}\n`;
      }
      if (job.required_qualifications) {
        prompt += `   ✅ REQUIRED Qualifications: ${job.required_qualifications}\n`;
      }
      if (job.preferred_qualifications) {
        prompt += `   ⭐ PREFERRED Qualifications: ${job.preferred_qualifications}\n`;
      }
      if (job.required_skills?.length > 0) {
        prompt += `   🎯 Required Skills (${job.required_skills.length}): ${job.required_skills.join(', ')}\n`;
        
        // Skill matching analysis
        const userSkillNames = context.skills.map((s: any) => s.skill_name.toLowerCase());
        const matchingSkills = job.required_skills.filter((skill: string) => 
          userSkillNames.includes(skill.toLowerCase())
        );
        const missingSkills = job.required_skills.filter((skill: string) => 
          !userSkillNames.includes(skill.toLowerCase())
        );
        
        if (matchingSkills.length > 0) {
          const matchPercentage = Math.round((matchingSkills.length / job.required_skills.length) * 100);
          prompt += `   ✅ SKILL MATCH: ${matchPercentage}% (${matchingSkills.length}/${job.required_skills.length} skills)\n`;
          prompt += `   ✅ You Have: ${matchingSkills.join(', ')}\n`;
        }
        if (missingSkills.length > 0) {
          prompt += `   📚 Need to Learn: ${missingSkills.join(', ')}\n`;
          
          // Check if missing skills are in roadmap
          const roadmapSkills = context.roadmap?.skills_to_learn?.map((s: any) => s.skill_name.toLowerCase()) || [];
          const inRoadmap = missingSkills.filter((skill: string) => roadmapSkills.includes(skill.toLowerCase()));
          const notInRoadmap = missingSkills.filter((skill: string) => !roadmapSkills.includes(skill.toLowerCase()));
          
          if (inRoadmap.length > 0) {
            prompt += `   🎓 Already in Learning Roadmap: ${inRoadmap.join(', ')}\n`;
          }
          if (notInRoadmap.length > 0) {
            prompt += `   ⚠️ Not Yet in Roadmap (suggest adding): ${notInRoadmap.join(', ')}\n`;
          }
        }
      }
      if (job.benefits?.length > 0) {
        prompt += `   💼 Benefits: ${job.benefits.join(', ')}\n`;
      }
      if (job.application_deadline) {
        prompt += `   ⏰ Application Deadline: ${job.application_deadline}\n`;
      }
      prompt += `\n`;
    });
    if (context.interestedJobs.length > 10) {
      prompt += `   ... and ${context.interestedJobs.length - 10} more jobs of interest\n`;
    }
    prompt += `\n`;
  }

  // Learning Roadmap
  if (context.roadmap && context.roadmap.skills_to_learn) {
    prompt += `=== PERSONALIZED LEARNING ROADMAP ===\n`;
    if (context.roadmap.skills_to_learn?.length > 0) {
      prompt += `Skills Currently Being Developed (${context.roadmap.skills_to_learn.length} skills):\n`;
      context.roadmap.skills_to_learn.slice(0, 12).forEach((skill: any, index: number) => {
        prompt += `${index + 1}. ${skill.skill_name} (Current: ${skill.current_level || 'Starting'} → Target: ${skill.skill_level})`;
        if (skill.phase_number) {
          prompt += ` - Phase ${skill.phase_number}`;
        }
        if (skill.phase_description) {
          prompt += ` - ${skill.phase_description}`;
        }
        if (skill.learning_path) {
          prompt += `\n   Learning Path: ${skill.learning_path}`;
        }
        if (skill.estimated_duration) {
          prompt += `\n   Duration: ${skill.estimated_duration}`;
        }
        prompt += `\n`;
      });
      if (context.roadmap.skills_to_learn.length > 12) {
        prompt += `   ... and ${context.roadmap.skills_to_learn.length - 12} more skills in the roadmap\n`;
      }
    }
    if (context.roadmap.target_jobs?.length > 0) {
      prompt += `\nTarget Job Roles (${context.roadmap.target_jobs.length}):\n`;
      context.roadmap.target_jobs.forEach((job: any, index: number) => {
        prompt += `${index + 1}. ${job.job_title}`;
        if (job.company_name) {
          prompt += ` at ${job.company_name}`;
        }
        if (job.required_skills?.length > 0) {
          prompt += `\n   Skills Needed: ${job.required_skills.join(', ')}`;
        }
        prompt += `\n`;
      });
    }
    if (context.roadmap.gap_analysis) {
      prompt += `\nSkill Gap Analysis:\n${context.roadmap.gap_analysis}\n`;
    }
    prompt += `\n`;
  }

  // Available Jobs in the Market
  if (context.availableJobs.length > 0) {
    prompt += `=== AVAILABLE JOB OPPORTUNITIES (${context.availableJobs.length} jobs in the market) ===\n`;
    prompt += `These are currently open positions that may match the user's profile:\n`;
    
    // Filter jobs that might be relevant based on user's skills
    const userSkillNames = context.skills.map((s: any) => s.skill_name.toLowerCase());
    const relevantJobs = context.availableJobs.filter((job: any) => {
      if (!job.required_skills || job.required_skills.length === 0) return true;
      const jobSkills = job.required_skills.map((s: string) => s.toLowerCase());
      return jobSkills.some((skill: string) => userSkillNames.includes(skill));
    });

    const jobsToShow = relevantJobs.slice(0, 15);
    jobsToShow.forEach((job: any, index: number) => {
      prompt += `${index + 1}. ${job.job_title} at ${job.company_name || 'Company not disclosed'}\n`;
      prompt += `   Location: ${job.city}, ${job.country} | Mode: ${job.work_mode} | Level: ${job.experience_level} | Type: ${job.job_type}\n`;
      
      if (job.salary_min && job.salary_max) {
        prompt += `   💰 Salary: ${job.salary_currency} ${job.salary_min} - ${job.salary_max}\n`;
      }
      
      // Job description and details
      if (job.job_description) {
        const shortDesc = job.job_description.substring(0, 150);
        prompt += `   📄 ${shortDesc}${job.job_description.length > 150 ? '...' : ''}\n`;
      }
      
      if (job.responsibilities) {
        const shortResp = job.responsibilities.substring(0, 120);
        prompt += `   📋 Key Responsibilities: ${shortResp}${job.responsibilities.length > 120 ? '...' : ''}\n`;
      }
      
      if (job.required_skills?.length > 0) {
        const matchingSkills = job.required_skills.filter((skill: string) => 
          userSkillNames.includes(skill.toLowerCase())
        );
        const missingSkills = job.required_skills.filter((skill: string) => 
          !userSkillNames.includes(skill.toLowerCase())
        );
        
        const matchPercentage = Math.round((matchingSkills.length / job.required_skills.length) * 100);
        prompt += `   🎯 Skill Match: ${matchPercentage}% (${matchingSkills.length}/${job.required_skills.length})\n`;
        
        if (matchingSkills.length > 0) {
          prompt += `   ✅ You Have: ${matchingSkills.slice(0, 5).join(', ')}${matchingSkills.length > 5 ? `, +${matchingSkills.length - 5} more` : ''}\n`;
        }
        if (missingSkills.length > 0) {
          prompt += `   📚 Need: ${missingSkills.slice(0, 3).join(', ')}${missingSkills.length > 3 ? `, +${missingSkills.length - 3} more` : ''}\n`;
        }
      }
      
      // Indicate if it's already saved or in interested list
      const isSaved = context.savedJobs.some((sj: any) => sj.id === job.id);
      const isInterested = context.interestedJobs.some((ij: any) => ij.id === job.id);
      if (isSaved) prompt += `   💾 User has SAVED this job\n`;
      if (isInterested) prompt += `   ⭐ User is INTERESTED in this job\n`;
      
      if (job.application_deadline) {
        prompt += `   ⏰ Deadline: ${job.application_deadline}\n`;
      }
      
      prompt += `\n`;
    });
    
    if (relevantJobs.length > 15) {
      prompt += `   ... and ${relevantJobs.length - 15} more relevant jobs available\n`;
    }
    if (context.availableJobs.length > relevantJobs.length) {
      prompt += `   (${context.availableJobs.length - relevantJobs.length} additional jobs may require different skill sets)\n`;
    }
    prompt += `\n`;
  }

  // AI Role and Instructions
  prompt += `=== YOUR ROLE AS HOPE ===\n`;
  prompt += `You are Hope, a compassionate career companion who has COMPLETE knowledge of ${context.user?.full_name || 'this user'}'s professional journey. You have access to:\n`;
  prompt += `- Their full profile (${context.user?.full_name})\n`;
  prompt += `- ${context.skills.length} skills (verified and in development)\n`;
  prompt += `- ${context.experiences.length} work experiences\n`;
  prompt += `- ${context.educations.length} educational qualifications\n`;
  prompt += `- ${context.savedJobs.length} saved jobs\n`;
  prompt += `- ${context.interestedJobs.length} jobs they're interested in\n`;
  prompt += `- ${context.availableJobs.length} currently available job opportunities\n`;
  prompt += `- Their complete learning roadmap with ${context.roadmap?.skills_to_learn?.length || 0} skills in development\n\n`;
  
  prompt += `YOUR MISSION:\n\n`;
  
  prompt += `1. **Be a Highly Personalized Job Matchmaker**:\n`;
  prompt += `   - You have ${context.availableJobs.length} jobs in the market to recommend from\n`;
  prompt += `   - Analyze job requirements against their ${context.skills.length} skills\n`;
  prompt += `   - Identify which available jobs are the BEST matches for their profile\n`;
  prompt += `   - For their ${context.savedJobs.length} saved and ${context.interestedJobs.length} interested jobs, provide detailed insights\n`;
  prompt += `   - Explain match percentages: "This job matches 7 out of 10 required skills..."\n`;
  prompt += `   - Highlight jobs marked with ✅ (matching skills) and 📚 (skills to develop)\n`;
  prompt += `   - Point out opportunities they may have overlooked\n`;
  prompt += `   - When recommending a job, be SPECIFIC: "The ${context.availableJobs[0]?.job_title} position at ${context.availableJobs[0]?.company_name}..."\n\n`;
  
  prompt += `2. **Provide Strategic Career Roadmap Guidance**:\n`;
  prompt += `   - Reference their ${context.roadmap?.skills_to_learn?.length || 0} skills currently in development\n`;
  prompt += `   - Connect their learning roadmap to job opportunities\n`;
  prompt += `   - Suggest which skills to prioritize based on market demand\n`;
  prompt += `   - Create actionable learning plans: "Focus on completing Phase ${context.roadmap?.skills_to_learn?.[0]?.phase_number || 1} of ${context.roadmap?.skills_to_learn?.[0]?.skill_name}..."\n`;
  prompt += `   - Show how learning specific skills opens up specific job opportunities\n`;
  prompt += `   - Celebrate their progress and milestones\n\n`;
  
  prompt += `3. **Offer Deep Career Insights**:\n`;
  prompt += `   - Analyze their career trajectory based on ${context.experiences.length} experiences\n`;
  prompt += `   - Identify their unique strengths and competitive advantages\n`;
  prompt += `   - Suggest career paths that align with their goals\n`;
  prompt += `   - Help them understand industry trends\n`;
  prompt += `   - Provide salary negotiation insights based on job data\n\n`;
  
  prompt += `4. **Bridge Skill Gaps Proactively**:\n`;
  prompt += `   - For any job they're interested in, identify missing skills\n`;
  prompt += `   - Check if those skills are already in their roadmap\n`;
  prompt += `   - Suggest adding new skills to their roadmap when needed\n`;
  prompt += `   - Provide realistic timelines for skill development\n`;
  prompt += `   - Recommend whether to apply now or develop skills first\n\n`;
  
  prompt += `5. **Be Emotionally Intelligent and Supportive**:\n`;
  prompt += `   - Use the 'reportEmotion' tool silently to detect their emotional state\n`;
  prompt += `   - Acknowledge the challenges of job searching with empathy\n`;
  prompt += `   - Celebrate small wins and progress\n`;
  prompt += `   - Provide encouragement when they feel discouraged\n`;
  prompt += `   - Help them see opportunities even in setbacks\n\n`;
  
  prompt += `6. **Engage in Natural, Context-Rich Conversations**:\n`;
  prompt += `   - Always address them as "${context.user?.full_name}"\n`;
  prompt += `   - Reference their ACTUAL data: "I see you have ${context.skills.length} skills..."\n`;
  prompt += `   - Mention SPECIFIC jobs by name: "The Software Engineer role at XYZ Company..."\n`;
  prompt += `   - Connect the dots: "Your experience at ${context.experiences[0]?.company_name} makes you perfect for..."\n`;
  prompt += `   - Ask thoughtful follow-up questions\n`;
  prompt += `   - Have a flowing, two-way conversation\n\n`;
  
  prompt += `CRITICAL INTERACTION GUIDELINES:\n`;
  prompt += `- When they ask "What jobs should I apply to?": Recommend 3-5 SPECIFIC jobs from available opportunities with detailed reasoning\n`;
  prompt += `- When they ask about their profile: Reference their ACTUAL name, skills, and experience\n`;
  prompt += `- When they ask about skills to learn: Reference their ROADMAP and connect it to job requirements\n`;
  prompt += `- When they ask about a specific saved/interested job: Provide deep analysis with skill matching\n`;
  prompt += `- NEVER mention the emotion detection tool or the detected emotion\n`;
  prompt += `- Always be warm, supportive, and action-oriented\n`;
  prompt += `- Provide SPECIFIC next steps, not generic advice\n`;
  prompt += `- Help them see the clear, actionable path to their dream job\n\n`;
  
  prompt += `EXAMPLE RESPONSES:\n`;
  prompt += `❌ BAD: "You should look for jobs that match your skills."\n`;
  prompt += `✅ GOOD: "${context.user?.full_name}, based on your ${context.skills[0]?.skill_name} expertise, I recommend the ${context.availableJobs[0]?.job_title} position at ${context.availableJobs[0]?.company_name}. You match 8 out of 10 required skills!"\n\n`;
  
  prompt += `Remember: You are not just an AI assistant—you are Hope, their trusted career companion who genuinely understands their journey and wants to see them succeed. 💙\n`;

  return prompt;
}
