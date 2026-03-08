// Job Matching Algorithm
// Calculates match percentage between candidate profile and job requirements

interface CandidateProfile {
  skills?: Array<{ skill_name: string; skill_level?: string }>
  experience?: Array<{ job_title?: string; years?: number }>
  years_of_experience?: number
  job_preferences?: {
    preferred_job_types?: string[]
    preferred_work_modes?: string[]
    preferred_locations?: string[]
  }
  education?: Array<{ degree?: string; field_of_study?: string }>
}

interface Job {
  required_skills?: string[]
  preferred_skills?: string[]
  experience_level?: string
  job_type?: string
  work_mode?: string
  department?: string
  job_title?: string
  education_requirements?: string
}

export interface JobMatchResult {
  matchPercentage: number
  skillsMatch: {
    matched: string[]
    missing: string[]
    matchRate: number
  }
  experienceMatch: {
    isMatch: boolean
    candidateLevel: string
    requiredLevel: string
    score: number
  }
  preferencesMatch: {
    jobTypeMatch: boolean
    workModeMatch: boolean
    score: number
  }
  overallReasons: string[]
}

export function calculateJobMatch(
  candidate: CandidateProfile,
  job: Job
): JobMatchResult {
  let totalScore = 0
  let maxScore = 0

  // 1. Skills Match (50% weight)
  const skillsWeight = 50
  maxScore += skillsWeight

  const candidateSkills = (candidate.skills || []).map(s =>
    s.skill_name.toLowerCase().trim()
  )

  const requiredSkills = [
    ...(job.required_skills || []),
    ...(job.preferred_skills || [])
  ].map(s => s.toLowerCase().trim()).filter(Boolean)

  // Extract skills from job title and department
  const jobKeywords = [
    ...(job.job_title || '').toLowerCase().split(/[\s,]+/),
    ...(job.department || '').toLowerCase().split(/[\s,]+/)
  ].filter(k => k.length > 2)

  const allJobSkills = [...new Set([...requiredSkills, ...jobKeywords])]

  const matchedSkills: string[] = []
  const missingSkills: string[] = []

  allJobSkills.forEach(jobSkill => {
    const isMatch = candidateSkills.some(candidateSkill =>
      candidateSkill.includes(jobSkill) || jobSkill.includes(candidateSkill)
    )
    if (isMatch) {
      matchedSkills.push(jobSkill)
    } else {
      missingSkills.push(jobSkill)
    }
  })

  const skillsMatchRate = allJobSkills.length > 0
    ? (matchedSkills.length / allJobSkills.length) * 100
    : 50 // neutral if no skills specified

  totalScore += (skillsMatchRate / 100) * skillsWeight

  // 2. Experience Level Match (30% weight)
  const experienceWeight = 30
  maxScore += experienceWeight

  const experienceMap: Record<string, number> = {
    'entry': 1,
    'entry level': 1,
    'junior': 1,
    'mid': 2,
    'mid level': 2,
    'intermediate': 2,
    'senior': 3,
    'lead': 4,
    'lead/manager': 4,
    'principal': 5,
    'expert': 5
  }

  const candidateYears = candidate.years_of_experience || 0
  let candidateLevel = 'entry'
  if (candidateYears >= 7) candidateLevel = 'senior'
  else if (candidateYears >= 3) candidateLevel = 'mid'
  else if (candidateYears >= 1) candidateLevel = 'junior'

  const requiredLevel = (job.experience_level || 'entry').toLowerCase()
  const candidateLevelScore = experienceMap[candidateLevel] || 1
  const requiredLevelScore = experienceMap[requiredLevel] || 1

  let experienceScore = 0
  if (candidateLevelScore >= requiredLevelScore) {
    experienceScore = 100 // meets or exceeds
  } else {
    // partial credit for being close
    experienceScore = (candidateLevelScore / requiredLevelScore) * 70
  }

  totalScore += (experienceScore / 100) * experienceWeight

  // 3. Job Preferences Match (20% weight)
  const preferencesWeight = 20
  maxScore += preferencesWeight

  const prefs = candidate.job_preferences || {}
  let preferencesScore = 0
  let preferencesChecks = 0

  // Job type preference
  if (prefs.preferred_job_types && prefs.preferred_job_types.length > 0) {
    preferencesChecks++
    const jobType = (job.job_type || '').toLowerCase()
    const matchesJobType = prefs.preferred_job_types.some(pt =>
      jobType.includes(pt.toLowerCase())
    )
    if (matchesJobType) preferencesScore += 50
  }

  // Work mode preference
  if (prefs.preferred_work_modes && prefs.preferred_work_modes.length > 0) {
    preferencesChecks++
    const workMode = (job.work_mode || '').toLowerCase()
    const matchesWorkMode = prefs.preferred_work_modes.some(wm =>
      workMode.includes(wm.toLowerCase())
    )
    if (matchesWorkMode) preferencesScore += 50
  }

  // If no preferences set, give neutral score
  if (preferencesChecks === 0) {
    preferencesScore = 50
  } else {
    preferencesScore = preferencesScore / preferencesChecks
  }

  totalScore += (preferencesScore / 100) * preferencesWeight

  // Calculate final match percentage
  const matchPercentage = Math.round((totalScore / maxScore) * 100)

  // Generate reasons
  const overallReasons: string[] = []

  if (matchedSkills.length > 0) {
    overallReasons.push(`Matches ${matchedSkills.slice(0, 3).join(', ')}${matchedSkills.length > 3 ? ` +${matchedSkills.length - 3} more` : ''}`)
  }

  if (missingSkills.length > 0 && missingSkills.length <= 3) {
    overallReasons.push(`Missing ${missingSkills.join(', ')}`)
  } else if (missingSkills.length > 3) {
    overallReasons.push(`Missing ${missingSkills.slice(0, 2).join(', ')} +${missingSkills.length - 2} more`)
  }

  if (experienceScore >= 100) {
    overallReasons.push(`Experience level matches (${candidateLevel})`)
  } else if (experienceScore < 70) {
    overallReasons.push(`Requires ${requiredLevel} level experience`)
  }

  return {
    matchPercentage,
    skillsMatch: {
      matched: matchedSkills,
      missing: missingSkills,
      matchRate: skillsMatchRate
    },
    experienceMatch: {
      isMatch: experienceScore >= 70,
      candidateLevel,
      requiredLevel,
      score: experienceScore
    },
    preferencesMatch: {
      jobTypeMatch: preferencesScore >= 25,
      workModeMatch: preferencesScore >= 25,
      score: preferencesScore
    },
    overallReasons
  }
}

// External job platforms for recommendations
export const externalJobPlatforms = [
  {
    name: 'LinkedIn',
    url: 'https://www.linkedin.com/jobs',
    icon: '💼',
    description: 'Professional network with global opportunities'
  },
  {
    name: 'BDjobs',
    url: 'https://www.bdjobs.com',
    icon: '🇧🇩',
    description: 'Leading job portal in Bangladesh'
  },
  {
    name: 'Glassdoor',
    url: 'https://www.glassdoor.com/Job',
    icon: '🏢',
    description: 'Company reviews and job listings'
  },
  {
    name: 'Indeed',
    url: 'https://www.indeed.com',
    icon: '🔍',
    description: 'Worldwide job search engine'
  },
  {
    name: 'AngelList',
    url: 'https://wellfound.com/jobs',
    icon: '🚀',
    description: 'Startup and tech jobs'
  }
]
