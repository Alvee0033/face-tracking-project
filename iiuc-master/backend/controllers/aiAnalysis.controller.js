const { supabase, supabaseAdmin } = require('../config/supabase');
const AIAnalysisService = require('../services/aiAnalysis.service');

/**
 * Analyze job skills using AI when job is created/updated
 */
const analyzeJobSkills = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    // Get job data
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        *,
        recruiter_profiles!inner(
          user_id
        )
      `)
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Job not found'
      });
    }

    // Verify job ownership
    if (job.recruiter_profiles.user_id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to analyze this job'
      });
    }

    // Get existing manual skills
    const { data: existingSkills } = await supabase
      .from('job_skills')
      .select('skill_name')
      .eq('job_id', jobId);

    const manualSkills = existingSkills ? existingSkills.map(s => s.skill_name) : [];

    // Extract skills using AI
    const extractedSkills = await AIAnalysisService.extractJobSkills({
      jobTitle: job.job_title,
      department: job.department,
      jobDescription: job.job_description,
      responsibilities: job.responsibilities,
      qualifications: job.qualifications,
      niceToHave: job.nice_to_have,
      benefits: job.benefits,
      requiredSkills: manualSkills
    });

    // Clear existing job skills
    await supabaseAdmin
      .from('job_skills')
      .delete()
      .eq('job_id', jobId);

    // Insert new skills
    if (extractedSkills.length > 0) {
      const skillsToInsert = extractedSkills.map(skill => ({
        job_id: jobId,
        skill_name: skill.skill
      }));

      const { error: skillsError } = await supabaseAdmin
        .from('job_skills')
        .insert(skillsToInsert);

      if (skillsError) {
        console.error('Error inserting job skills:', skillsError);
      }
    }

    res.json({
      message: 'Job skills analyzed successfully',
      extractedSkills: extractedSkills,
      skillsCount: extractedSkills.length
    });

  } catch (error) {
    console.error('Analyze job skills error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to analyze job skills'
    });
  }
};

/**
 * Analyze candidate-job skill match with improved caching
 */
const analyzeCandidateJobMatch = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    // Get candidate profile
    const { data: candidateProfile, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (candidateError || !candidateProfile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Candidate profile not found'
      });
    }

    const candidateId = candidateProfile.id;

    // 1. Check for valid cached analysis in skill_match_scores (fastest lookup)
    const { data: cachedScore } = await supabase
      .from('skill_match_scores')
      .select('*')
      .eq('job_id', jobId)
      .eq('candidate_id', candidateId)
      .gt('score_valid_until', new Date().toISOString())
      .single();

    if (cachedScore) {
      // Increment cache hit count
      try {
        await supabaseAdmin
          .from('skill_match_scores')
          .update({
            updated_at: new Date().toISOString()
          })
          .eq('id', cachedScore.id);
      } catch (updateError) {
        console.log('Could not update cache hit count:', updateError.message);
      }

      return res.json({
        message: 'Using cached match score (from fast cache)',
        analysis: {
          overall_match_percentage: cachedScore.overall_match_percentage,
          required_skills: {
            matched: cachedScore.required_skills_matched,
            total: cachedScore.required_skills_total
          },
          preferred_skills: {
            matched: cachedScore.preferred_skills_matched,
            total: cachedScore.preferred_skills_total
          },
          nice_to_have_skills: {
            matched: cachedScore.nice_to_have_matched,
            total: cachedScore.nice_to_have_total
          },
          score_computed_at: cachedScore.score_computed_at
        },
        cached: true,
        cacheSource: 'skill_match_scores'
      });
    }

    // 2. Check for cached detailed analysis in job_skill_analysis (30-day cache)
    const { data: existingAnalysis } = await supabase
      .from('job_skill_analysis')
      .select('*')
      .eq('job_id', jobId)
      .eq('candidate_id', candidateId)
      .gt('cache_valid_until', new Date().toISOString())
      .single();

    if (existingAnalysis && existingAnalysis.is_cached) {
      // Increment cache hit count
      try {
        await supabaseAdmin
          .from('job_skill_analysis')
          .update({
            cache_hit_count: (existingAnalysis.cache_hit_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingAnalysis.id);
      } catch (updateError) {
        console.log('Could not update cache hit count:', updateError.message);
      }

      return res.json({
        message: 'Using cached analysis (from detailed cache)',
        analysis: {
          matching_skills: existingAnalysis.matching_skills,
          missing_skills: existingAnalysis.missing_skills,
          match_percentage: existingAnalysis.skill_match_percentage,
          analysis_date: existingAnalysis.analysis_date
        },
        cached: true,
        cacheSource: 'job_skill_analysis'
      });
    }

    // 3. Get job skills
    const { data: jobSkills, error: jobSkillsError } = await supabase
      .from('job_skills')
      .select('skill_name')
      .eq('job_id', jobId);

    if (jobSkillsError) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch job skills'
      });
    }

    // 4. Get candidate skills
    const { data: candidateSkills, error: candidateSkillsError } = await supabase
      .from('candidate_skills')
      .select('skill_name, skill_level')
      .eq('candidate_id', candidateId);

    if (candidateSkillsError) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch candidate skills'
      });
    }

    // 5. Perform fresh AI analysis (cache miss)
    console.log(`🔄 Performing fresh skill match analysis for job ${jobId} and candidate ${candidateId}`);
    const analysis = await AIAnalysisService.analyzeSkillMatch(
      candidateSkills || [],
      jobSkills || []
    );

    // 6. Calculate score breakdown
    const requiredSkillsMatched = analysis.matching_skills.filter(s => s.job_requirement === 'required').length;
    const requiredSkillsTotal = jobSkills ? jobSkills.length : 0;
    const preferredSkillsMatched = analysis.matching_skills.filter(s => s.job_requirement === 'preferred').length;
    const preferredSkillsTotal = analysis.missing_skills.filter(s => s.job_requirement === 'preferred').length;
    const niceToHaveMatched = analysis.matching_skills.filter(s => s.job_requirement === 'nice_to_have').length;
    const niceToHaveTotal = analysis.missing_skills.filter(s => s.job_requirement === 'nice_to_have').length;

    const cacheValidUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // 7. Store detailed analysis with caching metadata
    try {
      await supabaseAdmin
        .from('job_skill_analysis')
        .upsert({
          job_id: jobId,
          candidate_id: candidateId,
          matching_skills: analysis.matching_skills,
          missing_skills: analysis.missing_skills,
          skill_match_percentage: analysis.match_percentage,
          analysis_date: new Date().toISOString(),
          cache_valid_until: cacheValidUntil,
          is_cached: true,
          ai_call_count: 1,
          cache_hit_count: 0
        });
    } catch (storeError) {
      console.log('Detailed analysis storage not available:', storeError.message);
    }

    // 8. Store fast-lookup score cache
    try {
      await supabaseAdmin
        .from('skill_match_scores')
        .upsert({
          job_id: jobId,
          candidate_id: candidateId,
          overall_match_percentage: analysis.match_percentage,
          required_skills_matched: requiredSkillsMatched,
          required_skills_total: requiredSkillsTotal,
          preferred_skills_matched: preferredSkillsMatched,
          preferred_skills_total: preferredSkillsTotal,
          nice_to_have_matched: niceToHaveMatched,
          nice_to_have_total: niceToHaveTotal,
          score_computed_at: new Date().toISOString(),
          score_valid_until: cacheValidUntil
        });
    } catch (scoreStoreError) {
      console.log('Match score cache storage not available:', scoreStoreError.message);
    }

    res.json({
      message: 'Skill match analyzed successfully (fresh analysis)',
      analysis: {
        matching_skills: analysis.matching_skills,
        missing_skills: analysis.missing_skills,
        match_percentage: analysis.match_percentage,
        analysis_date: new Date().toISOString()
      },
      cached: false,
      cacheSource: 'fresh_analysis'
    });

  } catch (error) {
    console.error('Analyze candidate job match error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to analyze skill match'
    });
  }
};

/**
 * Get skill recommendations for missing skills (with caching)
 */
const getSkillRecommendations = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    // Get candidate profile
    const { data: candidateProfile, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (candidateError || !candidateProfile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Candidate profile not found'
      });
    }

    // Check for cached recommendations (within 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    let cachedRecommendations = null;
    try {
      const { data } = await supabase
        .from('job_skill_recommendations')
        .select('*')
        .eq('job_id', jobId)
        .eq('candidate_id', candidateProfile.id)
        .gte('generated_date', sevenDaysAgo)
        .single();
      cachedRecommendations = data;
    } catch (cacheError) {
      // Table might not exist, continue without cache
      console.log('Recommendations cache not available:', cacheError.message);
    }

    if (cachedRecommendations) {
      return res.json({
        message: 'Using cached recommendations',
        recommendations: cachedRecommendations.recommendations,
        generated_date: cachedRecommendations.generated_date,
        cached: true
      });
    }

    // Try to get latest analysis for missing skills from cache table
    let analysis = null;
    try {
      const { data, error: analysisError } = await supabase
        .from('job_skill_analysis')
        .select('missing_skills')
        .eq('job_id', jobId)
        .eq('candidate_id', candidateProfile.id)
        .order('analysis_date', { ascending: false })
        .limit(1)
        .single();

      if (!analysisError) {
        analysis = data;
      }
    } catch (analysisError) {
      // Table might not exist or no analysis found - compute on the fly
      console.log('Analysis retrieval not available, computing fresh analysis...');
    }

    // If no cached analysis, compute it on the fly
    if (!analysis) {
      // Get job skills
      const { data: jobSkills, error: jobSkillsError } = await supabase
        .from('job_skills')
        .select('skill_name')
        .eq('job_id', jobId);

      if (jobSkillsError) {
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to fetch job skills'
        });
      }

      // Get candidate skills
      const { data: candidateSkills, error: candidateSkillsError } = await supabase
        .from('candidate_skills')
        .select('skill_name, skill_level')
        .eq('candidate_id', candidateProfile.id);

      if (candidateSkillsError) {
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to fetch candidate skills'
        });
      }

      // Perform AI analysis
      const skillAnalysis = await AIAnalysisService.analyzeSkillMatch(
        candidateSkills || [],
        jobSkills || []
      );

      analysis = { missing_skills: skillAnalysis.missing_skills };
    }

    // No missing skills = no recommendations needed
    if (!analysis.missing_skills || analysis.missing_skills.length === 0) {
      return res.json({
        message: 'No missing skills - no recommendations needed',
        recommendations: []
      });
    }

    // Generate AI recommendations
    const recommendations = await AIAnalysisService.getSkillRecommendations(
      analysis.missing_skills
    );

    // Cache the recommendations
    try {
      const { error: cacheError } = await supabaseAdmin
        .from('job_skill_recommendations')
        .upsert({
          job_id: jobId,
          candidate_id: candidateProfile.id,
          recommendations: recommendations,
          generated_date: new Date().toISOString()
        });

      if (cacheError) {
        console.error('Error caching recommendations:', cacheError);
      }
    } catch (cacheError) {
      // Table might not exist, skip caching
      console.log('Recommendations cache not available for storing:', cacheError.message);
    }

    res.json({
      message: 'Skill recommendations generated successfully',
      recommendations: recommendations,
      generated_date: new Date().toISOString(),
      cached: false
    });

  } catch (error) {
    console.error('Get skill recommendations error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get skill recommendations'
    });
  }
};

/**
 * Trigger re-analysis when skills change
 */
const triggerReanalysis = async (req, res) => {
  try {
    const { jobId, candidateId } = req.body;

    if (!jobId || !candidateId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'jobId and candidateId are required'
      });
    }

    // Delete existing analysis to force re-analysis
    const { error: deleteError } = await supabase
      .from('job_skill_analysis')
      .delete()
      .eq('job_id', jobId)
      .eq('candidate_id', candidateId);

    if (deleteError) {
      console.error('Error deleting existing analysis:', deleteError);
    }

    res.json({
      message: 'Re-analysis triggered successfully. Next job view will perform fresh analysis.'
    });

  } catch (error) {
    console.error('Trigger re-analysis error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to trigger re-analysis'
    });
  }
};

/**
 * Generate free courses with embedded videos
 */
const generateFreeCourses = async (req, res) => {
  try {
    const { skills, jobs } = req.body;

    if (!skills || skills.length === 0) {
      // Return fallback courses
      const fallbackCourses = getFreeCoursesFallback([]);
      return res.status(200).json({
        success: true,
        message: 'Free courses loaded',
        courses: fallbackCourses
      });
    }

    // Use fallback courses (no AI call needed for free content)
    const courses = getFreeCoursesFallback(skills);

    res.status(200).json({
      success: true,
      message: 'Free courses loaded successfully',
      courses: courses,
      totalCourses: courses.length
    });

  } catch (error) {
    console.error('Error generating free courses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load courses',
      error: error.message
    });
  }
};

/**
 * Curated free courses database
 */
const getFreeCoursesFallback = (skills) => {
  const freeCourses = [
    {
      title: "JavaScript Programming - Full Course",
      description: "Learn JavaScript from scratch with hands-on projects. Covers variables, functions, objects, arrays, ES6+, async programming, and DOM manipulation.",
      platform: "YouTube",
      duration: "3 hours 26 minutes",
      level: "Beginner",
      instructor: "freeCodeCamp",
      videoUrl: "https://www.youtube.com/watch?v=PkZNo7MFNFg",
      thumbnail: "https://img.youtube.com/vi/PkZNo7MFNFg/maxresdefault.jpg",
      skills: ["JavaScript", "ES6", "Programming", "Web Development"],
      playlistUrl: "https://www.youtube.com/c/Freecodecamp"
    },
    {
      title: "React JS - Complete Course for Beginners",
      description: "Master React including components, hooks, state management, routing, and building real-world applications with modern best practices.",
      platform: "YouTube",
      duration: "11 hours 48 minutes",
      level: "Beginner to Intermediate",
      instructor: "freeCodeCamp",
      videoUrl: "https://www.youtube.com/watch?v=bMknfKXIFA8",
      thumbnail: "https://img.youtube.com/vi/bMknfKXIFA8/maxresdefault.jpg",
      skills: ["React", "JavaScript", "Frontend", "Hooks"],
      playlistUrl: "https://www.youtube.com/watch?v=bMknfKXIFA8"
    },
    {
      title: "Python for Beginners - Full Course",
      description: "Comprehensive Python programming course covering syntax, data structures, OOP, file handling, and building practical projects.",
      platform: "YouTube",
      duration: "4 hours 26 minutes",
      level: "Beginner",
      instructor: "Programming with Mosh",
      videoUrl: "https://www.youtube.com/watch?v=_uQrJ0TkZlc",
      thumbnail: "https://img.youtube.com/vi/_uQrJ0TkZlc/maxresdefault.jpg",
      skills: ["Python", "Programming", "Data Structures", "OOP"],
      playlistUrl: "https://www.youtube.com/@programmingwithmosh"
    },
    {
      title: "Node.js and Express.js - Full Course",
      description: "Learn backend development with Node.js and Express. Build RESTful APIs, work with databases, authentication, and deployment.",
      platform: "YouTube",
      duration: "8 hours 16 minutes",
      level: "Intermediate",
      instructor: "freeCodeCamp",
      videoUrl: "https://www.youtube.com/watch?v=Oe421EPjeBE",
      thumbnail: "https://img.youtube.com/vi/Oe421EPjeBE/maxresdefault.jpg",
      skills: ["Node.js", "Express", "Backend", "REST API", "MongoDB"],
      playlistUrl: "https://www.youtube.com/watch?v=Oe421EPjeBE"
    },
    {
      title: "AWS Certified Cloud Practitioner Course",
      description: "Complete AWS fundamentals covering EC2, S3, Lambda, RDS, VPC, and cloud computing concepts. Prepare for certification.",
      platform: "YouTube",
      duration: "4 hours 10 minutes",
      level: "Beginner",
      instructor: "freeCodeCamp",
      videoUrl: "https://www.youtube.com/watch?v=SOTamWNgDKc",
      thumbnail: "https://img.youtube.com/vi/SOTamWNgDKc/maxresdefault.jpg",
      skills: ["AWS", "Cloud Computing", "DevOps", "Infrastructure"],
      playlistUrl: "https://www.youtube.com/watch?v=SOTamWNgDKc"
    },
    {
      title: "SQL Tutorial - Full Database Course",
      description: "Master SQL and database design. Learn queries, joins, indexes, normalization, and work with MySQL and PostgreSQL.",
      platform: "YouTube",
      duration: "4 hours 20 minutes",
      level: "Beginner to Intermediate",
      instructor: "freeCodeCamp",
      videoUrl: "https://www.youtube.com/watch?v=HXV3zeQKqGY",
      thumbnail: "https://img.youtube.com/vi/HXV3zeQKqGY/maxresdefault.jpg",
      skills: ["SQL", "Database", "MySQL", "PostgreSQL", "Data Management"],
      playlistUrl: "https://www.youtube.com/watch?v=HXV3zeQKqGY"
    },
    {
      title: "Docker Tutorial for Beginners",
      description: "Learn containerization with Docker. Covers images, containers, volumes, networking, Docker Compose, and best practices.",
      platform: "YouTube",
      duration: "3 hours 10 minutes",
      level: "Beginner to Intermediate",
      instructor: "TechWorld with Nana",
      videoUrl: "https://www.youtube.com/watch?v=3c-iBn73dDE",
      thumbnail: "https://img.youtube.com/vi/3c-iBn73dDE/maxresdefault.jpg",
      skills: ["Docker", "Containerization", "DevOps", "Deployment"],
      playlistUrl: "https://www.youtube.com/playlist?list=PLy7NrYWoggjxCF3av5JKwyG7FFF9eVV"
    },
    {
      title: "Git and GitHub for Beginners",
      description: "Master version control with Git and GitHub. Learn commits, branches, merging, pull requests, and collaboration workflows.",
      platform: "YouTube",
      duration: "1 hour 8 minutes",
      level: "Beginner",
      instructor: "freeCodeCamp",
      videoUrl: "https://www.youtube.com/watch?v=RGOj5yH7evk",
      thumbnail: "https://img.youtube.com/vi/RGOj5yH7evk/maxresdefault.jpg",
      skills: ["Git", "GitHub", "Version Control", "Collaboration"],
      playlistUrl: "https://www.youtube.com/watch?v=RGOj5yH7evk"
    },
    {
      title: "TypeScript Course for Beginners",
      description: "Learn TypeScript from basics to advanced. Covers types, interfaces, generics, decorators, and building scalable applications.",
      platform: "YouTube",
      duration: "1 hour 54 minutes",
      level: "Intermediate",
      instructor: "Programming with Mosh",
      videoUrl: "https://www.youtube.com/watch?v=d56mG7DezGs",
      thumbnail: "https://img.youtube.com/vi/d56mG7DezGs/maxresdefault.jpg",
      skills: ["TypeScript", "JavaScript", "Programming", "Type Safety"],
      playlistUrl: "https://www.youtube.com/@programmingwithmosh"
    },
    {
      title: "Data Structures and Algorithms",
      description: "Complete DSA course covering arrays, linked lists, trees, graphs, sorting, searching, dynamic programming, and problem solving.",
      platform: "YouTube",
      duration: "5 hours 20 minutes",
      level: "Intermediate to Advanced",
      instructor: "freeCodeCamp",
      videoUrl: "https://www.youtube.com/watch?v=8hly31xKli0",
      thumbnail: "https://img.youtube.com/vi/8hly31xKli0/maxresdefault.jpg",
      skills: ["Data Structures", "Algorithms", "Problem Solving", "Programming"],
      playlistUrl: "https://www.youtube.com/watch?v=8hly31xKli0"
    },
    {
      title: "REST API Design Best Practices",
      description: "Learn to design professional REST APIs with proper architecture, security, versioning, documentation, and industry standards.",
      platform: "YouTube",
      duration: "2 hours 45 minutes",
      level: "Intermediate",
      instructor: "Academind",
      videoUrl: "https://www.youtube.com/watch?v=0oXYLzuucwE",
      thumbnail: "https://img.youtube.com/vi/0oXYLzuucwE/maxresdefault.jpg",
      skills: ["REST API", "Backend", "Architecture", "Web Services"],
      playlistUrl: "https://www.youtube.com/@academind"
    },
    {
      title: "Machine Learning Course - Python",
      description: "Introduction to machine learning with Python. Covers supervised learning, regression, classification, neural networks, and scikit-learn.",
      platform: "YouTube",
      duration: "3 hours 35 minutes",
      level: "Intermediate",
      instructor: "freeCodeCamp",
      videoUrl: "https://www.youtube.com/watch?v=NWONeJKn6kc",
      thumbnail: "https://img.youtube.com/vi/NWONeJKn6kc/maxresdefault.jpg",
      skills: ["Machine Learning", "Python", "AI", "Data Science"],
      playlistUrl: "https://www.youtube.com/watch?v=NWONeJKn6kc"
    }
  ];

  // Filter courses based on matching skills
  if (skills && skills.length > 0) {
    const matchingCourses = freeCourses.filter(course =>
      course.skills.some(courseSkill =>
        skills.some(jobSkill =>
          jobSkill.toLowerCase().includes(courseSkill.toLowerCase()) ||
          courseSkill.toLowerCase().includes(jobSkill.toLowerCase())
        )
      )
    );

    // Return matching courses or all if no matches
    if (matchingCourses.length > 0) {
      return matchingCourses.slice(0, 9).map((course, index) => ({
        id: `course_${Date.now()}_${index}`,
        ...course
      }));
    }
  }

  // Return all courses if no skills provided or no matches
  return freeCourses.slice(0, 9).map((course, index) => ({
    id: `course_${Date.now()}_${index}`,
    ...course
  }));
};

/**
 * Analyze applicant compatibility with job requirements
 */
const analyzeApplicantCompatibility = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user.id;

    // Get the user's JWT token from the request
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;

    // Create a Supabase client with the user's JWT token
    const { createClient } = require('@supabase/supabase-js');
    const userSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // Get recruiter profile
    const { data: recruiterProfile, error: recruiterError } = await userSupabase
      .from('recruiter_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (recruiterError || !recruiterProfile) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Recruiter profile not found'
      });
    }

    // Get application with job and candidate details
    const { data: application, error: applicationError } = await userSupabase
      .from('job_applications')
      .select(`
        *,
        jobs!inner(
          *,
          recruiter_id,
          job_skills(skill_name)
        ),
        candidate_profiles!inner(
          *,
          profiles!inner(
            full_name,
            email
          )
        )
      `)
      .eq('id', applicationId)
      .single();

    if (applicationError || !application) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Application not found'
      });
    }

    // Check if analysis already exists and is still valid
    // Re-analyze if:
    // 1. No analysis exists
    // 2. Candidate profile/skills updated after analysis
    // 3. Job requirements updated after analysis
    const { data: existingAnalysis } = await userSupabase
      .from('job_applications')
      .select('ai_analysis_score, ai_analysis_data, ai_analyzed_at')
      .eq('id', applicationId)
      .single();

    let shouldReanalyze = true;

    if (existingAnalysis && existingAnalysis.ai_analysis_data && existingAnalysis.ai_analyzed_at) {
      const analysisDate = new Date(existingAnalysis.ai_analyzed_at);
      const candidateUpdatedAt = new Date(application.candidate_profiles.updated_at || 0);
      const jobUpdatedAt = new Date(application.jobs.updated_at || 0);

      // Only reanalyze if candidate or job was updated after the last analysis
      if (analysisDate > candidateUpdatedAt && analysisDate > jobUpdatedAt) {
        shouldReanalyze = false;
        // Return cached analysis
        return res.json({
          message: 'Using cached analysis',
          application_id: applicationId,
          candidate_name: application.candidate_profiles.profiles.full_name,
          job_title: application.jobs.job_title,
          analysis: existingAnalysis.ai_analysis_data,
          analyzed_at: existingAnalysis.ai_analyzed_at,
          cached: true
        });
      }
    }

    // Verify job ownership
    if (application.jobs.recruiter_id !== recruiterProfile.id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to analyze this application'
      });
    }

    // Get candidate details
    const candidateId = application.candidate_profiles.id;

    // Get candidate skills
    const { data: skills } = await userSupabase
      .from('candidate_skills')
      .select('*')
      .eq('candidate_id', candidateId);

    // Get candidate experience
    const { data: experience } = await userSupabase
      .from('candidate_experience')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('start_date', { ascending: false });

    // Get candidate education
    const { data: education } = await userSupabase
      .from('candidate_education')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('start_date', { ascending: false });

    // Get candidate certifications
    const { data: certifications } = await userSupabase
      .from('candidate_certifications')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('issue_date', { ascending: false });

    // Prepare data for AI analysis
    const candidateData = {
      ...application.candidate_profiles,
      skills: skills || [],
      experience: experience || [],
      education: education || [],
      certifications: certifications || []
    };

    const jobData = {
      ...application.jobs,
      required_skills: application.jobs.job_skills?.map(s => s.skill_name) || []
    };

    console.log(`DEBUG: Analyzing candidate ${candidateId} for job ${application.jobs.id}`);
    console.log(`DEBUG: Candidate Data: ${candidateData.bg_check_status || 'N/A'}`); // random check

    // Perform AI compatibility analysis
    console.log('DEBUG: Calling AIAnalysisService.analyzeCandidateCompatibility...');
    const analysis = await AIAnalysisService.analyzeCandidateCompatibility(
      candidateData,
      jobData
    );
    console.log('DEBUG: AI Analysis Result:', analysis ? 'Success' : 'Empty');

    // Save analysis to database
    const { error: updateError } = await supabaseAdmin
      .from('job_applications')
      .update({
        ai_analysis_score: analysis.overall_score,
        ai_analysis_data: analysis,
        ai_analyzed_at: new Date().toISOString()
      })
      .eq('id', applicationId);

    if (updateError) {
      console.error('Error saving analysis to database:', updateError);
      // Continue anyway - analysis was successful
    }

    res.json({
      message: 'Applicant compatibility analyzed successfully',
      application_id: applicationId,
      candidate_name: application.candidate_profiles.profiles.full_name,
      job_title: application.jobs.job_title,
      analysis: analysis,
      analyzed_at: new Date().toISOString(),
      cached: false
    });

  } catch (error) {
    console.error('Analyze applicant compatibility error:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to analyze applicant compatibility',
      details: error.message
    });
  }
};

/**
 * Generate AI summary for a course
 */
const generateCourseSummary = async (req, res) => {
  try {
    const { title, description, skills, duration, level, instructor, platform } = req.body;

    if (!title || !description || !skills) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Title, description, and skills are required'
      });
    }

    const summary = await AIAnalysisService.generateCourseSummary({
      title,
      description,
      skills: Array.isArray(skills) ? skills : [],
      duration: duration || 'Not specified',
      level: level || 'All levels',
      instructor: instructor || 'Unknown',
      platform: platform || 'Online'
    });

    res.json({
      success: true,
      data: {
        summary
      }
    });

  } catch (error) {
    console.error('Generate course summary error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate course summary',
      details: error.message
    });
  }
};

/**
 * Generate mind map for a course
 */
const generateCourseMindMap = async (req, res) => {
  try {
    const { title, description, skills, level } = req.body;

    if (!title || !description || !skills) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Title, description, and skills are required'
      });
    }

    const prompt = `
      Create a hierarchical mind map for the course: "${title}".
      Description: ${description ? description.substring(0, 200) : 'N/A'}
      Skills: ${skills.join(', ')}
      Level: ${level}

      Return ONLY a valid JSON object with this EXACT structure (no markdown, no code blocks):
      {
        "title": "${title}",
        "nodes": [
          {
            "id": "root",
            "label": "${title}",
            "level": 0,
            "parentId": null,
            "color": "#0d9488"
          },
          {
            "id": "1",
            "label": "Main Topic",
            "level": 1,
            "parentId": "root",
            "color": "#14b8a6"
          }
        ]
      }

      Rules:
      1. "root" node is mandatory.
      2. Generate 3-5 main branches (level 1) connected to "root".
      3. For each main branch, generate 2-3 sub-branches (level 2).
      4. "color" must be a valid hex code (use teal/cyan variations like #0d9488, #14b8a6, #2dd4bf).
      5. "parentId" must reference a valid "id" from the list.
      6. Total nodes should be between 10 and 20.
      7. Ensure valid JSON.
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
      const data = JSON.parse(jsonStr);

      return data;
    } catch (error) {
      console.error("AI Generation Error:", error);
      // Fallback data if AI fails
      return {
        title: title,
        nodes: [
          { id: "root", label: title, level: 0, parentId: null, color: "#0d9488" },
          { id: "1", label: "Overview", level: 1, parentId: "root", color: "#14b8a6" },
          { id: "2", label: "Key Concepts", level: 1, parentId: "root", color: "#14b8a6" },
          { id: "3", label: "Practice", level: 1, parentId: "root", color: "#14b8a6" }
        ]
      };
    }

  } catch (error) {
    console.error('Generate mind map error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate mind map',
      details: error.message
    });
  }
};

/**
 * Generate comprehensive study notes for a course
 */
const generateCourseNotes = async (req, res) => {
  try {
    const { title, description, skills, duration, level, instructor, platform } = req.body;

    if (!title || !description || !skills) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Title, description, and skills are required'
      });
    }

    const notes = await AIAnalysisService.generateCourseNotes({
      title,
      description,
      skills: Array.isArray(skills) ? skills : [],
      duration: duration || 'Not specified',
      level: level || 'All levels',
      instructor: instructor || 'Unknown',
      platform: platform || 'Online'
    });

    res.json({
      success: true,
      data: {
        notes
      }
    });

  } catch (error) {
    console.error('Generate course notes error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate course notes',
      details: error.message
    });
  }
};

/**
 * Generate course exam questions
 */
const generateCourseExam = async (req, res) => {
  try {
    const { topic } = req.body;

    if (!topic) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Topic is required'
      });
    }

    const aiQuestionGenerator = require('../services/aiQuestionGenerator.service');
    const questions = await aiQuestionGenerator.generateCourseExamQuestions(topic);

    res.json({
      success: true,
      data: questions
    });
  } catch (error) {
    console.error('Generate exam error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate exam questions'
    });
  }
};

module.exports = {
  analyzeJobSkills,
  analyzeCandidateJobMatch,
  getSkillRecommendations,
  triggerReanalysis,
  generateFreeCourses,
  analyzeApplicantCompatibility,
  generateCourseSummary,
  generateCourseMindMap,
  generateCourseNotes,
  generateCourseExam
};
