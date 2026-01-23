const { Groq } = require('groq-sdk');
const ToonUtil = require('../utils/toon.util');

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * AI Analysis Service for Job Skills and Candidate Matching
 */
class AIAnalysisService {

  /**
   * Generate AI course summary
   * @param {Object} courseData - Course information
   * @returns {Object} Course summary with overview, topics, and outcomes
   */
  static async generateCourseSummary(courseData) {
    try {
      const prompt = `
        Generate a comprehensive summary for the following course:
        
        Title: ${courseData.title}
        Description: ${courseData.description}
        Skills: ${courseData.skills.join(', ')}
        Duration: ${courseData.duration}
        Level: ${courseData.level}
        Instructor: ${courseData.instructor}
        Platform: ${courseData.platform}
        
        Create a detailed course summary with the following information.
        
        Return ONLY valid JSON in this exact structure:
        {
          "overview": "A comprehensive 3-4 sentence overview of what this course covers and its main focus",
          "keyTopics": [
            "Topic 1: Brief description",
            "Topic 2: Brief description",
            "Topic 3: Brief description",
            "Topic 4: Brief description",
            "Topic 5: Brief description"
          ],
          "learningOutcomes": [
            "Outcome 1: What you'll be able to do",
            "Outcome 2: What you'll be able to do",
            "Outcome 3: What you'll be able to do",
            "Outcome 4: What you'll be able to do",
            "Outcome 5: What you'll be able to do"
          ],
          "targetAudience": "Who should take this course (2-3 sentences)",
          "prerequisites": "What you need to know before starting (1-2 sentences)",
          "timeCommitment": "Estimated time to complete with practice (e.g., '4-6 weeks with 5 hours per week')"
        }
        
        IMPORTANT:
        - Make keyTopics specific and actionable (e.g., "Variables and Data Types: Understanding let, const, and var")
        - Make learningOutcomes measurable (e.g., "Build interactive web applications using JavaScript")
        - Ensure all arrays have at least 5 items
        - Be specific to the course content
        
        Return ONLY the JSON object, no markdown formatting, no explanations.
      `;

      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_completion_tokens: 1500,
        stream: false
      });

      const content = response.choices[0].message.content.trim();

      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```(json|text)?\n?|\n?```/g, '').trim();
      const summary = JSON.parse(cleanContent);

      return summary;
    } catch (error) {
      console.error('Error generating course summary:', error);
      throw error;
    }
  }

  /**
   * Generate mind map structure for course using AI
   * @param {Object} courseData - Course information
   * @returns {Object} Mind map structure with nodes and connections
   */
  static async generateCourseMindMap(courseData) {
    try {
      const prompt = `
        Generate a JSON mind map for: "${courseData.title}".
        Context: ${courseData.description?.substring(0, 150)}...
        
        Return ONLY valid JSON with this structure:
        {
          "title": "${courseData.title}",
          "nodes": [
            { "id": "root", "label": "Main Title", "level": 0, "parentId": null, "color": "#0d9488" },
            { "id": "1", "label": "Topic A", "level": 1, "parentId": "root", "color": "#14b8a6" }
          ]
        }
        
        Rules:
        - Root node + 4 main branches + 2 sub-branches each.
        - Colors: Teal hex codes only (#0d9488, #14b8a6).
        - No markdown. JSON only.
      `;

      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3, // Lower for faster, deterministic output
        max_completion_tokens: 1000,
        stream: false
      });

      const content = response.choices[0].message.content.trim();
      const cleanContent = content.replace(/```(json|text)?\n?|\n?```/g, '').trim();
      const mindMap = JSON.parse(cleanContent);

      return mindMap;
    } catch (error) {
      console.error('Error generating mind map:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive study notes for course
   * @param {Object} courseData - Course information
   * @returns {Object} Detailed study notes with multiple sections
   */
  static async generateCourseNotes(courseData) {
    try {
      console.log('Genering notes for:', courseData.title);

      const prompt = `Generate comprehensive technical study notes for this course in valid JSON format.

Course Details:
- Title: ${courseData.title}
- Description: ${courseData.description || 'A technical course about ' + courseData.title}
- Skills: ${courseData.skills?.join(', ') || 'Technical Skills'}
- Duration: ${courseData.duration || 'Self-paced'}
- Level: ${courseData.level || 'General'}

INSTRUCTIONS:
1. Even if the description is short, INFER the likely curriculum based on the Title and Skills. 
2. Be creative but accurate to the subject matter.
3. Structure the response strictly as valid JSON.

Create detailed notes with this EXACT JSON structure:

{
  "courseTitle": "${courseData.title}",
  "generatedDate": "${new Date().toISOString().split('T')[0]}",
  "overview": {
    "introduction": "2-3 sentences introducing the course",
    "courseScope": "2-3 sentences about what's covered",
    "targetAudience": "Who should take this",
    "prerequisites": ["Prerequisite 1", "Prerequisite 2"]
  },
  "learningObjectives": {
    "primaryGoals": ["Goal 1", "Goal 2", "Goal 3"],
    "skillsYouWillGain": ["Skill 1", "Skill 2", "Skill 3"],
    "expectedOutcomes": "What you'll achieve"
  },
  "topics": [
    {
      "topicNumber": 1,
      "title": "First Major Topic",
      "introduction": "Topic intro",
      "keyConcepts": [
        {"concept": "Concept 1", "definition": "Definition", "importance": "Why it matters"}
      ],
      "detailedExplanation": "In-depth explanation with examples",
      "practicalExamples": ["Example 1", "Example 2"],
      "bestPractices": ["Practice 1", "Practice 2"],
      "commonMistakes": ["Mistake 1", "Mistake 2"]
    }
  ],
  "keyTakeaways": {
    "summary": "Overall summary",
    "criticalPoints": ["Point 1", "Point 2", "Point 3"],
    "realWorldApplications": ["Application 1", "Application 2"]
  },
  "additionalResources": {
    "recommendedReading": ["Resource 1", "Resource 2"],
    "practiceProjects": ["Project 1", "Project 2"],
    "nextSteps": ["Step 1", "Step 2"]
  },
  "practiceExercises": [
    {"exerciseNumber": 1, "question": "Question", "difficulty": "Easy", "hint": "Hint"}
  ]
}

Generate at least 3 detailed topics. Return ONLY the JSON object.`;

      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_completion_tokens: 8000,
        stream: false,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content.trim();
      console.log('AI Response Length:', content.length);

      let notes;
      try {
        notes = JSON.parse(content);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError.message);
        console.error('Raw Content Preview:', content.substring(0, 500));
        throw new Error('Failed to parse AI response as JSON');
      }

      // Validate the structure
      if (!notes.courseTitle || !notes.overview || !notes.topics) {
        throw new Error('Invalid notes structure: missing required fields');
      }

      return notes;
    } catch (error) {
      console.error('Error generating course notes:', error);

      // Improved Fallback to prevent "nothing inside note"
      return {
        courseTitle: courseData.title,
        generatedDate: new Date().toISOString().split('T')[0],
        overview: {
          targetAudience: "N/A",
          prerequisites: []
        },
        learningObjectives: {
          primaryGoals: [],
          skillsYouWillGain: [],
          expectedOutcomes: "N/A"
        },
        topics: [],
        keyTakeaways: {
          summary: "Content unavailable due to generation error.",
          criticalPoints: [],
          realWorldApplications: []
        },
        additionalResources: {
          recommendedReading: [],
          practiceProjects: [],
          nextSteps: []
        },
        practiceExercises: []
      };
    }
  }

  /**
   * Extract skills from job posting using AI
   * @param {Object} jobData - Complete job data
   * @returns {Array} Array of extracted skills
   */
  static async extractJobSkills(jobData) {
    try {
      const manualSkillsSection = jobData.requiredSkills && jobData.requiredSkills.length > 0
        ? `\nManually Specified Required Skills: ${jobData.requiredSkills.join(', ')}`
        : '';

      const prompt = `
        Analyze the following job posting and extract ALL technical skills, tools, technologies, and competencies mentioned.
        
        Job Title: ${jobData.jobTitle || ''}
        Department: ${jobData.department || ''}
        Job Description: ${jobData.jobDescription || ''}
        Responsibilities: ${jobData.responsibilities || ''}
        Qualifications: ${jobData.qualifications || ''}
        Nice to Have: ${jobData.niceToHave || ''}
        Benefits: ${jobData.benefits || ''}${manualSkillsSection}
        
        Return ONLY a TOON array of skills in this exact format:
        skills[count]{skill,category,importance}:
        skill_name,category,importance
        
        Example:
        skills[2]{skill,category,importance}: React,framework,required TypeScript,language,preferred
        
        IMPORTANT: If there are manually specified required skills, you MUST include ALL of them in your output as "required" importance.
        Additionally, extract any other skills mentioned in the job description, responsibilities, and qualifications.
        Be comprehensive but precise. Include programming languages, frameworks, tools, methodologies, soft skills, etc.
        Normalize skill names (e.g., "React.js" -> "React", "JavaScript" -> "JavaScript").
        Do not include generic terms like "experience" or "knowledge".
      `;

      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are an expert at analyzing job postings and extracting technical skills. Return only TOON format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_completion_tokens: 2000,
        stream: false
      });

      const cleanContent = response.choices[0].message.content.replace(/```(toon|text)?\n?|\n?```/g, '').trim();
      let extractedSkills = [];
      try {
        const parsed = ToonUtil.parse(cleanContent);
        // The parser returns an object, we anticipate "skills" key with array
        if (parsed.skills && Array.isArray(parsed.skills)) {
          extractedSkills = parsed.skills;
        } else if (Array.isArray(parsed)) {
          // In case AI returns just the array part or utility parses it differently
          extractedSkills = parsed;
        }
      } catch (e) {
        console.error("Failed to parse TOON skills", e);
      }

      // Validate and normalize the response
      if (!Array.isArray(extractedSkills)) {
        // Fallback or empty
        extractedSkills = [];
      }

      return extractedSkills.map(skill => ({
        skill: skill.skill?.toLowerCase().trim() || '',
        category: skill.category || 'other',
        importance: skill.importance || 'required'
      })).filter(skill => skill.skill.length > 0);

    } catch (error) {
      console.error('Error extracting job skills:', error);
      throw new Error('Failed to extract job skills using AI');
    }
  }

  /**
   * Analyze candidate skills against job requirements
   * @param {Array} candidateSkills - Candidate's skills array
   * @param {Array} jobSkills - Job's required skills array
   * @returns {Object} Analysis result with matching and missing skills
   */
  static async analyzeSkillMatch(candidateSkills, jobSkills) {
    try {
      const prompt = `
        Analyze the skill match between a candidate and a job posting.
        
        CANDIDATE SKILLS:
        ${JSON.stringify(candidateSkills, null, 2)}
        
        JOB REQUIRED SKILLS:
        ${JSON.stringify(jobSkills, null, 2)}
        
        Return a TOON object in this exact format:
        
        match_percentage: 85
        matching_skills[count]{skill,candidate_level,job_requirement,match_quality}: React,Intermediate,required,exact
        missing_skills[count]{skill,job_requirement,importance}: Docker,preferred,medium
        
        Rules:
        - Consider skill variations (e.g., "React" matches "React.js", "JavaScript" matches "JS")
        - Be generous with matching - include similar skills
        - Calculate match percentage based on required skills only
        - Include soft skills in analysis
        - Prioritize exact matches over similar ones
      `;

      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are an expert recruiter analyzing skill compatibility. Return only valid TOON format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_completion_tokens: 3000,
        stream: false
      });

      const cleanContent = response.choices[0].message.content.replace(/```(toon|text)?\n?|\n?```/g, '').trim();
      const analysis = ToonUtil.parse(cleanContent) || {};

      // Validate response structure
      // ToonUtil.parse might return strings for numbers if not obvious, so we safeguard number parsing
      const percentage = Number(analysis.match_percentage) || 0;

      return {
        matching_skills: analysis.matching_skills || [],
        missing_skills: analysis.missing_skills || [],
        match_percentage: Math.max(0, Math.min(100, percentage))
      };

    } catch (error) {
      console.error('Error analyzing skill match:', error);
      throw new Error('Failed to analyze skill match using AI');
    }
  }

  /**
   * Get skill recommendations for missing skills
   * @param {Array} missingSkills - Array of missing skills
   * @returns {Array} Array of skill recommendations with learning paths
   */
  static async getSkillRecommendations(missingSkills) {
    try {
      if (!missingSkills || missingSkills.length === 0) {
        return [];
      }

      const prompt = `
        Provide learning recommendations for these missing skills:
        ${JSON.stringify(missingSkills, null, 2)}
        
        Return a TOON list in this format:
        recommendations[count]{skill,learning_path,resources,estimated_time,difficulty}: 
        SkillName, "Brief path", "Resource1; Resource2", 2_weeks, beginner
        
        Focus on practical, actionable learning paths.
        Include free and paid resources.
        Be specific about time estimates.
      `;

      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are a career development expert providing skill learning recommendations. Return only valid TOON format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_completion_tokens: 2000,
        stream: false
      });

      const cleanContent = response.choices[0].message.content.replace(/```(toon|text)?\n?|\n?```/g, '').trim();
      const parsed = ToonUtil.parse(cleanContent);
      const recommendations = parsed.recommendations || [];

      return Array.isArray(recommendations) ? recommendations : [];

    } catch (error) {
      console.error('Error getting skill recommendations:', error);
      return [];
    }
  }

  /**
   * Generate comprehensive learning roadmap for multiple interested jobs
   * @param {Array} candidateSkills - Candidate's current skills
   * @param {Array} interestedJobs - Array of interested jobs with their skills
   * @param {Array} currentCourses - Candidate's current courses (optional)
   * @returns {Object} Structured learning roadmap with phases
   */
  static async generateLearningRoadmap(candidateSkills, interestedJobs, currentCourses = []) {
    try {
      if (!interestedJobs || interestedJobs.length === 0) {
        return {
          learning_phases: [],
          career_paths: [],
          total_time_estimate: '0 months',
          total_skills_needed: 0
        };
      }

      // Aggregate all unique skills from all interested jobs
      const allJobSkills = [];
      interestedJobs.forEach(job => {
        if (job.skills && Array.isArray(job.skills)) {
          job.skills.forEach(skill => {
            allJobSkills.push({
              skill: skill.skill_name,
              job_title: job.job_title,
              job_id: job.id
            });
          });
        }
      });

      // Format candidate skills for clarity
      const candidateSkillsList = candidateSkills.map(s => `${s.skill_name} (${s.skill_level})`).join(', ') || 'None';

      // Format job requirements for clarity
      const jobsSummary = interestedJobs.map(job => {
        const requiredSkills = job.skills?.map(s => s.skill_name).join(', ') || 'Not specified';
        return `- ${job.job_title} (${job.department}, ${job.experience_level}): Requires ${requiredSkills}`;
      }).join('\n');

      // Get all unique required skills
      const allRequiredSkills = new Set();
      interestedJobs.forEach(job => {
        if (job.skills && Array.isArray(job.skills)) {
          job.skills.forEach(skill => allRequiredSkills.add(skill.skill_name));
        }
      });
      const requiredSkillsList = Array.from(allRequiredSkills).join(', ') || 'None';

      // Format current courses
      const coursesList = currentCourses && currentCourses.length > 0
        ? currentCourses.map(c => `- ${c.skill_name} (${c.skill_level}): "${c.video_title}" [${c.is_watched ? 'Watched' : 'Not watched'}]`).join('\n')
        : 'None';

      const prompt = `
        You are a career development expert. Analyze a candidate's skills against their interested jobs and create a personalized learning roadmap.
        
        CANDIDATE'S CURRENT SKILLS (with expertise levels):
        ${candidateSkillsList}
        
        CANDIDATE'S INTERESTED JOBS:
        ${jobsSummary}
        
        ALL REQUIRED SKILLS FROM INTERESTED JOBS:
        ${requiredSkillsList}
        
        CANDIDATE'S CURRENT COURSES (video titles they are studying):
        ${coursesList}
        
        CRITICAL ANALYSIS TASK:
        1. For EACH required skill, check if the candidate ALREADY HAS it
        2. If they have it:
           - Check their current level (Beginner, Intermediate, Advanced, Expert)
           - Determine if they need to UPGRADE (e.g., "React from Beginner to Intermediate")
           - If their level is already sufficient, SKIP this skill entirely
        3. If they DON'T have it:
           - Mark it as a NEW SKILL to learn
        4. Create a roadmap with ONLY:
           - NEW skills the candidate doesn't have at all
           - UPGRADE paths for skills they have but need to improve
        
        IMPORTANT MATCHING RULES:
        - Match skills case-insensitively (e.g., "React", "react", "REACT" are the same)
        - Match skill variants (e.g., "Node.js", "Nodejs", "NodeJS" are the same)
        - If candidate has "React (Beginner)" and job needs "React", they need to UPGRADE to Intermediate/Advanced
        - If candidate has "AWS (Expert)" and job needs "AWS", SKIP it (they already have it)
        
        Create an EXTREMELY DETAILED, COMPREHENSIVE learning roadmap with EVERYTHING needed for career success.
        Structure by proficiency levels (Beginner, Intermediate, Advanced) with MAXIMUM detail.
        
        CRITICAL: For EACH skill, provide:
        1. **Learning Resources** (3-5 items each):
           - Online courses (Udemy, Coursera, Pluralsight, Udacity)
           - Books (with authors)
           - YouTube channels/playlists
           - Official documentation URLs
           - Interactive tutorials (freeCodeCamp, Codecademy, etc.)
           - Practice platforms (LeetCode, HackerRank, CodeWars)
        
        2. **Detailed Learning Path**:
           - Step-by-step curriculum (5-10 steps)
           - Learning objectives for each step
           - Time estimate for each step
           - Prerequisites clearly marked
        
        3. **Practice & Application**:
           - 5-8 hands-on coding exercises
           - 3-5 real-world project ideas
           - Common interview questions (5-10)
           - Code challenge problems
        
        4. **Certifications**:
           - 2-3 relevant certifications
           - Certification prep resources
           - Cost estimates
        
        For EACH proficiency level, include:
        - **Detailed Topics**: Complete breakdown with subtopics
        - **Projects**: 3-5 detailed projects with technologies, GitHub examples, outcomes
        - **Milestones**: Clear checkpoints with self-assessment criteria
        
        Additionally provide:
        - **Career Insights**:
          - Salary ranges by experience (entry/mid/senior)
          - Job market demand (High/Medium/Low)
          - Top hiring companies (5-10)
          - Remote work opportunities
        
        - **Interview Preparation**:
          - 10-15 common technical questions
          - 5-8 behavioral questions
          - Mock interview resources
          - Assessment tips
        
        - **Networking**:
          - Communities (Reddit, Discord, Slack groups)
          - Conferences and events
          - Mentorship platforms
          - LinkedIn optimization tips
        
        - **Portfolio Building**:
          - What to include
          - Project showcase tips
          - GitHub best practices
          - Personal website recommendations
        
        Return ONLY a JSON object in this EXACT format (no markdown):
        {
          "skill_gap_analysis": {
             "new_skills_needed": ["Skill A"],
             "skills_to_upgrade": [{"skill": "Skill C", "current_level": "Beginner", "target_level": "Intermediate"}]
          },
          "learning_phases": [
            {
              "level": "Beginner",
              "phase": 1,
              "title": "Foundation & Basics",
              "duration": "4-6 weeks",
              "description": "Master core concepts...",
              "skills": [...]
            },
            {
              "level": "Intermediate",
              "phase": 2,
              "title": "Advanced Topics & Patterns",
              "duration": "6-8 weeks",
              "description": "Deep dive into complex topics...",
              "skills": [...]
            },
            {
              "level": "Advanced",
              "phase": 3,
              "title": "Architecture & Scale",
              "duration": "8-10 weeks",
              "description": "System design and optimization...",
              "skills": [...]
            }
          ],
          ],
          "project_ideas": {
             "beginner_projects": [
               {
                 "title": "Personal Portfolio Website",
                 "description": "Build a responsive portfolio showcasing your skills",
                 "technologies": ["HTML", "CSS", "JavaScript"],
                 "difficulty": "Easy",
                 "time_estimate": "1 week",
                 "learning_outcomes": ["DOM manipulation", "CSS layouts", "Responsive design"],
                 "github_example": "github.com/example/portfolio"
               }
             ],
             "intermediate_projects": [...],
             "advanced_projects": [...]
          },
          "career_insights": {
            "salary_ranges": {
              "entry_level": "$60k-$80k",
              "mid_level": "$80k-$120k",
              "senior_level": "$120k-$180k"
            },
            "job_market": {
              "demand": "High",
              "growth_rate": "15% annually",
              "top_companies": ["Google", "Meta", "Amazon", "Microsoft", "Apple"],
              "remote_opportunities": "Excellent"
            },
            "job_titles": ["Frontend Developer", "Full Stack Developer", "JavaScript Engineer"]
          },
          "interview_prep": {
            "technical_questions": [
              "Implement a debounce function",
              "Explain prototypal inheritance",
              "What are promises and async/await?"
            ],
            "behavioral_questions": [
              "Tell me about a challenging project",
              "How do you handle tight deadlines?"
            ],
            "assessment_tips": [
              "Practice live coding on CodePen",
              "Review common algorithms",
              "Prepare STAR method answers"
            ],
            "mock_interview_resources": ["Pramp.com", "interviewing.io"]
          },
          "networking": {
            "communities": [
              {"name": "r/javascript", "platform": "Reddit", "url": "reddit.com/r/javascript"},
              {"name": "JavaScript Mastery", "platform": "Discord", "members": "50k+"}
            ],
            "conferences": ["JSConf", "React Conf", "Node Summit"],
            "mentorship": ["MentorCruise", "ADPList"],
            "linkedin_tips": [
              "Add JavaScript certifications",
              "Share coding projects",
              "Engage with tech leaders"
            ]
          },
          "portfolio_guide": {
            "must_include": [
              "3-5 polished projects",
              "GitHub with clean README files",
              "Live demos hosted online",
              "Technical blog posts"
            ],
            "showcase_tips": [
              "Use professional screenshots",
              "Write case studies",
              "Highlight problem-solving"
            ],
            "github_best_practices": [
              "Write descriptive commit messages",
              "Include comprehensive README",
              "Add code comments"
            ]
          },
          "career_paths": [
            {"role": "Junior Frontend Developer", "readiness_percentage": 40, "level": "Beginner"}
          ],
          "summary": "Comprehensive roadmap..."
        }
      `;

      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are an expert career coach and technical mentor. Generate EXTREMELY detailed, comprehensive learning roadmaps with ALL resources, practice materials, career insights, and guidance. Return ONLY valid JSON without markdown."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_completion_tokens: 15000,
        stream: false
      });

      // Parse the response, handling potential markdown wrapping
      let roadmap;
      try {
        const content = response.choices?.[0]?.message?.content?.trim();
        if (!content) {
          throw new Error('AI returned empty response');
        }

        // Try to extract JSON from markdown code blocks
        let jsonContent = content;
        if (content.includes('```')) {
          // Remove markdown code blocks
          jsonContent = content.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
        }

        roadmap = JSON.parse(jsonContent);
      } catch (parseError) {
        console.error('Roadmap parse error:', parseError);
        console.error('Response content:', response.choices?.[0]?.message?.content);
        throw new Error('Failed to parse roadmap from AI response');
      }

      // Validate response structure
      if (!roadmap.learning_phases || !Array.isArray(roadmap.learning_phases)) {
        // Fallback or attempt to repair
        console.warn('AI returned invalid roadmap format, attempting to use partial data');
      }

      return {
        skill_gap_analysis: roadmap.skill_gap_analysis || {
          new_skills_needed: [],
          skills_to_upgrade: [],
          skills_already_sufficient: []
        },
        course_recommendations: roadmap.course_recommendations || {
          courses_to_keep: [],
          courses_to_archive: [],
          new_courses_needed: []
        },
        learning_phases: roadmap.learning_phases || [],
        project_ideas: roadmap.project_ideas || {},
        career_insights: roadmap.career_insights || {
          salary_ranges: {},
          job_market: {},
          job_titles: []
        },
        interview_prep: roadmap.interview_prep || {
          technical_questions: [],
          behavioral_questions: [],
          assessment_tips: [],
          mock_interview_resources: []
        },
        networking: roadmap.networking || {
          communities: [],
          conferences: [],
          mentorship: [],
          linkedin_tips: []
        },
        portfolio_guide: roadmap.portfolio_guide || {
          must_include: [],
          showcase_tips: [],
          github_best_practices: []
        },
        job_application_timeline: roadmap.job_application_timeline || {
          start_applying_after_phase: 2,
          suggested_timing: "After completing Phase 2",
          preparation_steps: [],
          target_roles: [],
          application_strategy: ""
        },
        career_paths: roadmap.career_paths || [],
        total_time_estimate: roadmap.total_time_estimate || '0 months',
        total_skills_needed: roadmap.total_skills_needed || 0,
        summary: roadmap.summary || ''
      };

    } catch (error) {
      console.error('Error generating learning roadmap:', error);
      throw new Error('Failed to generate learning roadmap using AI');
    }
  }

  /**
   * Analyze candidate compatibility with job requirements
   * @param {Object} candidateData - Candidate profile, skills, experience, education
   * @param {Object} jobData - Job requirements, skills, qualifications
   * @returns {Object} Compatibility analysis with score and gaps
   */
  static async analyzeCandidateCompatibility(candidateData, jobData) {
    try {
      // Use JSON for data representation as requested
      const prompt = `
        You are an expert recruiter analyzing candidate fit for a job position.
        Analyze the candidate's qualifications against the job requirements comprehensively.
        
        JOB REQUIREMENTS:
        Job Title: ${jobData.job_title || ''}
        Experience Level: ${jobData.experience_level || ''}
        Job Type: ${jobData.job_type || ''}
        Job Description: ${jobData.job_description || ''}
        Responsibilities: ${jobData.responsibilities || ''}
        Required Qualifications: ${jobData.qualifications || ''}
        Nice to Have: ${jobData.nice_to_have || ''}
        Minimum Experience: ${jobData.minimum_experience_years || 0} years
        Required Skills: ${JSON.stringify(jobData.required_skills || [])}
        
        CANDIDATE PROFILE:
        Current Role: ${candidateData.current_job_title || 'Not specified'}
        Current Company: ${candidateData.current_company || 'Not specified'}
        Years of Experience: ${candidateData.years_of_experience || 0}
        Bio: ${candidateData.bio || 'Not provided'}
        
        Candidate Skills:
        ${JSON.stringify(candidateData.skills || [], null, 2)}
        
        Work Experience:
        ${JSON.stringify(candidateData.experience || [], null, 2)}
        
        Education:
        ${JSON.stringify(candidateData.education || [], null, 2)}
        
        Certifications:
        ${JSON.stringify(candidateData.certifications || [], null, 2)}
        
        Return ONLY a JSON object in this EXACT format:
        {
          "overall_score": 85,
          "score_breakdown": {
            "skills_match": 80,
            "experience_match": 90,
            "education_match": 85,
            "overall_fit": 85
          },
          "strengths": [
            "Strong technical skills in required technologies",
            "Relevant work experience in similar role",
            "Excellent educational background"
          ],
          "skill_gaps": [
            "Missing: React.js - Required for frontend development",
            "Limited experience with: AWS - Needed for cloud deployment",
            "No certification in: Project Management"
          ],
          "experience_gaps": [
            "Lacks experience in leading teams",
            "Limited exposure to enterprise-scale projects"
          ],
          "recommendations": [
            "Strong candidate - Schedule interview immediately",
            "Consider for senior role given experience level",
            "May need training in React.js framework"
          ],
          "fit_level": "Excellent Fit",
          "summary": "This candidate demonstrates strong alignment with the job requirements with 85% compatibility. They possess most required skills and relevant experience. Minor gaps in React.js can be addressed through training."
        }
        
        SCORING GUIDELINES:
        - 90-100: Excellent fit - Exceeds requirements
        - 75-89: Good fit - Meets most requirements
        - 60-74: Moderate fit - Meets some requirements
        - Below 60: Poor fit - Significant gaps
        
        IMPORTANT RULES:
        - Be objective and data-driven in analysis
        - Highlight specific skill and experience gaps
        - Consider years of experience vs job requirements
        - Evaluate education relevance
        - Provide actionable recommendations
        - Use bullet points for clarity
        - Be honest about gaps but also highlight strengths
        - Score should reflect realistic compatibility
      `;

      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are an expert recruiter and HR analyst providing objective candidate assessments. Return only valid JSON objects."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2,
        max_completion_tokens: 2000,
        stream: false
      });

      let analysis;
      try {
        const content = response.choices[0].message.content.trim();
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : content;
        analysis = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('Failed to parse AI analysis JSON:', response.choices[0].message.content);
        throw new Error('AI Analysis format error');
      }

      // Validate response structure
      if (!analysis.overall_score || !analysis.score_breakdown) {
        throw new Error('AI returned invalid analysis format (missing scores)');
      }

      return {
        overall_score: Math.max(0, Math.min(100, analysis.overall_score || 0)),
        score_breakdown: analysis.score_breakdown || {},
        strengths: analysis.strengths || [],
        skill_gaps: analysis.skill_gaps || [],
        experience_gaps: analysis.experience_gaps || [],
        recommendations: analysis.recommendations || [],
        fit_level: analysis.fit_level || 'Unknown',
        summary: analysis.summary || ''
      };

    } catch (error) {
      console.error('Error analyzing candidate compatibility:', error);
      throw new Error('Failed to analyze candidate compatibility using AI');
    }
  }

  /**
   * Generate skill verification exam questions
   * @param {string} skillName - Name of the skill
   * @param {string} skillLevel - Level (Beginner, Intermediate, Advanced, Expert)
   * @returns {Array} Array of 10 exam questions with answers
   */
  static async generateSkillVerificationExam(skillName, skillLevel) {
    try {
      const difficultyMap = {
        'Beginner': 'basic and fundamental concepts',
        'Intermediate': 'intermediate concepts with practical applications',
        'Advanced': 'advanced concepts, best practices, and complex scenarios',
        'Expert': 'expert-level concepts, architecture, optimization, and edge cases'
      };

      const difficulty = difficultyMap[skillLevel] || difficultyMap['Beginner'];

      const prompt = `
        You must respond with STRICT JSON ONLY. No commentary, no markdown.

        Generate a skill verification exam for "${skillName}" at "${skillLevel}" level.
        Requirements:
        - Exactly 10 questions
        - Questions should test ${difficulty}
        - Each question must be multiple choice with 4 options (A, B, C, D)
        - Only one correct answer per question
        - Difficulty must match ${skillLevel} level

        The response MUST be a JSON array that matches this schema exactly:
        [
          {
            "question": "string",
            "options": {
              "A": "string",
              "B": "string",
              "C": "string",
              "D": "string"
            },
            "correctAnswer": "A"
          }
        ]

        Return ONLY the JSON array.`;


      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",  // Fast, reliable Groq model
        messages: [
          {
            role: "system",
            content: "You are an expert technical interviewer. Return ONLY a valid JSON array, nothing else."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_completion_tokens: 3000,
        temperature: 0.7,  // Add some variability to questions
        stream: false
      });

      // Log the full response for debugging
      console.log('AI Response - Finish reason:', response.choices?.[0]?.finish_reason);
      console.log('AI Response - Reasoning tokens:', response.usage?.completion_tokens_details?.reasoning_tokens);
      console.log('AI Response - Content length:', response.choices?.[0]?.message?.content?.length || 0);
      console.log('AI Response - Content preview:', response.choices?.[0]?.message?.content?.substring(0, 200));

      // Parse the response
      let questions;
      try {
        const content = response.choices?.[0]?.message?.content?.trim();
        if (!content) {
          console.error('AI returned empty content. Model used all tokens for reasoning.');
          console.error('Usage:', response.usage);
          throw new Error('AI returned empty response. Please try again.');
        }
        // Try to extract JSON array from response
        let jsonMatch = content.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          // If no array found, try parsing as object
          const parsed = JSON.parse(content);
          questions = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.exam || []);
        } else {
          questions = JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.error('Parse error:', parseError);
        console.error('Response content:', response.choices[0].message.content);
        throw new Error('Failed to parse exam questions from AI response');
      }

      // Validate we have exactly 10 questions
      if (!Array.isArray(questions) || questions.length !== 10) {
        throw new Error(`Expected 10 questions, got ${questions?.length || 0}`);
      }

      // Validate each question has required fields
      const optionLabels = ['A', 'B', 'C', 'D'];
      const randomizeOptions = (question, index) => {
        if (!question.question || !question.options || !question.correctAnswer) {
          throw new Error(`Question ${index + 1} is missing required fields`);
        }
        if (!optionLabels.includes(question.correctAnswer)) {
          throw new Error(`Question ${index + 1} has invalid correctAnswer`);
        }
        if (!question.options.A || !question.options.B || !question.options.C || !question.options.D) {
          throw new Error(`Question ${index + 1} is missing options`);
        }

        // Shuffle options to avoid always having the correct answer as A
        const shuffledEntries = Object.entries(question.options)
          .sort(() => Math.random() - 0.5);

        const newOptions = {};
        let newCorrectAnswer = 'A';

        shuffledEntries.forEach(([label, value], idx) => {
          const newLabel = optionLabels[idx];
          newOptions[newLabel] = value;
          if (label === question.correctAnswer) {
            newCorrectAnswer = newLabel;
          }
        });

        return {
          ...question,
          options: newOptions,
          correctAnswer: newCorrectAnswer,
          explanation: question.explanation || ''
        };
      };

      const randomizedQuestions = questions.map((question, index) => randomizeOptions(question, index));

      return randomizedQuestions;
    } catch (error) {
      console.error('Error generating skill verification exam:', error);
      throw new Error(`Failed to generate exam: ${error.message}`);
    }
  }

  /**
   * Evaluate exam answers and calculate score
   * @param {Array} questions - Original exam questions
   * @param {Array} answers - User's answers
   * @returns {Object} Score and results
   */
  static evaluateExamAnswers(questions, answers) {
    let score = 0;
    const results = [];

    questions.forEach((question, index) => {
      const userAnswer = answers[index]?.answer || '';
      const isCorrect = userAnswer.toUpperCase() === question.correctAnswer.toUpperCase();

      if (isCorrect) {
        score++;
      }

      results.push({
        questionIndex: index,
        question: question.question,
        userAnswer: userAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect: isCorrect,
        explanation: question.explanation || ''
      });
    });

    return {
      score,
      totalMarks: questions.length,
      percentage: Math.round((score / questions.length) * 100),
      passed: score >= 7, // Passing score is 7/10
      results
    };
  }

  /**
   * Generate professional summary for CV
   * @param {Object} profileData - Candidate profile data
   * @returns {string} Professional summary
   */
  static async generateProfessionalSummary(profileData) {
    try {
      const {
        headline,
        bio,
        yearsOfExperience,
        currentJobTitle,
        currentCompany,
        skills = [],
        experience = [],
        education = []
      } = profileData;

      const skillsList = skills.map(s => `${s.skill_name} (${s.skill_level})`).join(', ') || 'None';
      const experienceSummary = experience.slice(0, 3).map(exp =>
        `${exp.job_title} at ${exp.company}`
      ).join(', ') || 'None';
      const educationSummary = education.slice(0, 2).map(edu =>
        `${edu.degree} in ${edu.field_of_study}`
      ).join(', ') || 'None';

      const prompt = `Create a compelling 2-3 sentence professional summary for this candidate:

Name/Role: ${currentJobTitle || headline || 'Professional'}${currentCompany ? ` at ${currentCompany}` : ''}
Experience: ${yearsOfExperience || 'Multiple'} years
Key Skills: ${skillsList}
Background: ${experienceSummary}
Education: ${educationSummary}
${bio ? `\nAbout: ${bio.substring(0, 150)}` : ''}

Write a powerful, personalized summary highlighting their unique strengths. Do NOT use LaTeX or special symbols (like $). Use standard text for metrics (e.g., 95%). No pronouns. Be specific and impactful.`;

      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "Expert resume writer. Create personalized, compelling summaries. Use standard text for numbers/metrics. Do NOT use LaTeX. Be concise and powerful."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_completion_tokens: 150,
        temperature: 0.8,
        stream: false
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating professional summary:', error);
      throw new Error(`Failed to generate professional summary: ${error.message}`);
    }
  }

  /**
   * Enhance bullet points for experience/projects
   * @param {Array} items - Experience or project items
   * @returns {Array} Enhanced items with improved bullet points
   */
  static async enhanceBulletPoints(items) {
    try {
      if (!items || items.length === 0) {
        return [];
      }

      const enhancedItems = [];

      for (const item of items) {
        const itemType = item.job_title ? 'experience' : 'project';
        const title = item.job_title || item.project_title;
        const company = item.company || item.organization || '';
        const description = item.description || '';
        const technologies = item.technologies_used?.join(', ') || '';

        const prompt = `Transform this ${itemType} into 3-4 powerful bullet points:

${itemType === 'experience' ? `Position: ${title}` : `Project: ${title}`}${company ? `\nOrganization: ${company}` : ''}
Description: ${description || 'No details provided'}${technologies ? `\nTech Stack: ${technologies}` : ''}

Create impactful bullets with:
- Action verbs (Led, Built, Optimized, etc.)
- Quantified results (e.g., "Improved by 60%")
- No LaTeX or special characters (no $ symbols)
- Specific achievements
- Max 100 chars each

Return JSON array: ["bullet 1", "bullet 2", "bullet 3"]`;

        const response = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: "Expert resume writer. Create powerful, quantified bullet points. Do NOT use LaTeX. Return only JSON array."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_completion_tokens: 250,
          temperature: 0.8,
          stream: false
        });

        let bulletPoints = [];
        try {
          const content = response.choices[0].message.content.trim();
          // Try to parse JSON array
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            bulletPoints = JSON.parse(jsonMatch[0]);
          } else {
            // Fallback: split by newlines and clean up
            bulletPoints = content.split('\n')
              .map(line => line.replace(/^[-•*]\s*/, '').trim())
              .filter(line => line.length > 0)
              .slice(0, 4);
          }
        } catch (parseError) {
          console.error('Error parsing bullet points:', parseError);
          // Fallback: use original description as single bullet
          bulletPoints = description ? [description] : [];
        }

        enhancedItems.push({
          ...item,
          enhancedBulletPoints: bulletPoints
        });
      }

      return enhancedItems;
    } catch (error) {
      console.error('Error enhancing bullet points:', error);
      throw new Error(`Failed to enhance bullet points: ${error.message}`);
    }
  }

  /**
   * Generate recommendations for LinkedIn and portfolio
   * @param {Object} profileData - Candidate profile data
   * @returns {Object} Recommendations
   */
  static async generateProfileRecommendations(profileData) {
    try {
      const {
        linkedin_url,
        github_url,
        portfolio_website,
        behance_url,
        bio,
        headline,
        skills = [],
        experience = [],
        projects = []
      } = profileData;

      const prompt = `
        Analyze this candidate's profile and provide recommendations for improving their LinkedIn and online portfolio:
        
        Current LinkedIn: ${linkedin_url || 'Not provided'}
        Current GitHub: ${github_url || 'Not provided'}
        Current Portfolio: ${portfolio_website || 'Not provided'}
        Current Behance: ${behance_url || 'Not provided'}
        Current Headline: ${headline || 'Not provided'}
        Current Bio: ${bio || 'Not provided'}
        Skills Count: ${skills.length}
        Experience Count: ${experience.length}
        Projects Count: ${projects.length}
        
        Provide recommendations in JSON format. Do NOT use LaTeX formatting. Use standard text for metrics:
        {
          "linkedin": {
            "headline": "Recommended LinkedIn headline",
            "summary": "Recommended LinkedIn summary (3-4 sentences)",
            "improvements": ["improvement 1", "improvement 2", "improvement 3"]
          },
          "portfolio": {
            "recommendations": ["recommendation 1 with metrics", "recommendation 2", "recommendation 3"],
            "missingElements": ["element 1", "element 2"]
          },
          "general": {
            "strengths": ["strength 1", "strength 2"],
            "weaknesses": ["weakness 1", "weakness 2"],
            "actionItems": ["action 1", "action 2", "action 3"]
          }
        }
        
        Return ONLY valid JSON, nothing else.
      `;

      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are a career advisor and professional branding expert. Provide actionable recommendations. Do NOT use LaTeX. Return only valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_completion_tokens: 1000,
        temperature: 0.7,
        stream: false
      });

      let recommendations;
      try {
        const content = response.choices[0].message.content.trim();
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          recommendations = JSON.parse(jsonMatch[0]);
        } else {
          recommendations = JSON.parse(content);
        }
      } catch (parseError) {
        console.error('Error parsing recommendations:', parseError);
        throw new Error('Failed to parse recommendations from AI response');
      }

      return recommendations;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw new Error(`Failed to generate recommendations: ${error.message}`);
    }
  }

  /**
   * Generate admin insights from analytics data
   * @param {Object} analyticsData - Analytics summary data
   * @returns {Object} AI-generated insights
   */
  static async generateAdminInsights(analyticsData) {
    try {
      const prompt = `
        Analyze the following job portal analytics data and provide actionable insights:
        
        Total Analyses: ${analyticsData.totalAnalyses}
        Average Score: ${analyticsData.averageScore.toFixed(2)}/100
        Score Distribution:
          - High (80+): ${analyticsData.scoreDistribution.high}
          - Medium (50-79): ${analyticsData.scoreDistribution.medium}
          - Low (<50): ${analyticsData.scoreDistribution.low}
        
        Provide a JSON response with:
        1. summary: A brief 2-3 sentence summary of the overall performance
        2. keyFindings: Array of 3-5 key findings from the data
        3. recommendations: Array of 3-5 actionable recommendations for improvement
        4. trends: Brief description of any notable trends
        5. focusAreas: Array of 2-3 areas that need attention
        
        Return ONLY valid JSON in this format:
        {
          "summary": "string",
          "keyFindings": ["finding1", "finding2", ...],
          "recommendations": ["recommendation1", "recommendation2", ...],
          "trends": "string",
          "focusAreas": ["area1", "area2", ...]
        }
      `;

      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a data analyst providing insights for a job portal platform. Use LaTeX formatting for statistical values and percentages. Return only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_completion_tokens: 600,
        stream: false
      });

      const content = response.choices[0].message.content.trim();
      let insights;

      try {
        insights = JSON.parse(content);
      } catch (parseError) {
        // Fallback if JSON parsing fails
        insights = {
          summary: content.substring(0, 200),
          keyFindings: ['Analysis completed successfully'],
          recommendations: ['Review the data for patterns'],
          trends: 'Data analysis in progress',
          focusAreas: ['Overall performance']
        };
      }

      return insights;
    } catch (error) {
      console.error('Error generating admin insights:', error);
      // Return fallback insights
      return {
        summary: 'Analytics data processed successfully',
        keyFindings: [
          `Average compatibility score: ${analyticsData.averageScore.toFixed(2)}%`,
          `Total analyses performed: ${analyticsData.totalAnalyses}`,
          `High-scoring matches: ${analyticsData.scoreDistribution.high}`
        ],
        recommendations: [
          'Continue monitoring candidate-job matching trends',
          'Focus on improving low-scoring matches',
          'Analyze common skill gaps'
        ],
        trends: 'Steady analysis activity',
        focusAreas: ['Skill matching', 'Candidate development']
      };
    }
  }

  /**
   * Get cache statistics for admin dashboard
   * @param {Object} supabase - Supabase client
   * @returns {Object} Cache statistics
   */
  static async getCacheStatistics(supabase) {
    try {
      // Get cache stats from the view
      const { data: cacheStats, error: statsError } = await supabase
        .from('skill_analysis_cache_stats')
        .select('*')
        .single();

      if (statsError) {
        console.error('Error fetching cache stats:', statsError);
        throw new Error('Cache statistics view not available');
      }

      // Get match score stats from the view
      const { data: matchStats, error: matchError } = await supabase
        .from('skill_match_score_stats')
        .select('*')
        .single();

      if (matchError) {
        console.error('Error fetching match stats:', matchError);
        throw new Error('Match score statistics view not available');
      }

      // Calculate cache efficiency metrics
      const cacheEfficiency = {
        total_cached_analyses: cacheStats?.total_cached_analyses || 0,
        valid_cache_entries: cacheStats?.valid_cache_entries || 0,
        expired_cache_entries: cacheStats?.expired_cache_entries || 0,
        total_cache_hits: cacheStats?.total_cache_hits || 0,
        total_ai_calls: cacheStats?.total_ai_calls || 0,
        cache_hit_rate: (cacheStats?.cache_hit_rate_percent || 0).toFixed(2),
        avg_match_percentage: cacheStats?.avg_match_percentage || 0,
        min_match_percentage: cacheStats?.min_match_percentage || 0,
        max_match_percentage: cacheStats?.max_match_percentage || 0
      };

      const scoreStatistics = {
        total_score_records: matchStats?.total_score_records || 0,
        avg_overall_match: (matchStats?.avg_overall_match || 0).toFixed(2),
        avg_required_match_percent: (matchStats?.avg_required_match_percent || 0).toFixed(2),
        avg_preferred_match_percent: (matchStats?.avg_preferred_match_percent || 0).toFixed(2),
        avg_nice_to_have_match_percent: (matchStats?.avg_nice_to_have_match_percent || 0).toFixed(2),
        min_overall_match: matchStats?.min_overall_match || 0,
        max_overall_match: matchStats?.max_overall_match || 0,
        median_match_percentage: (matchStats?.median_match_percentage || 0).toFixed(2),
        valid_scores: matchStats?.valid_scores || 0,
        expired_scores: matchStats?.expired_scores || 0
      };

      return {
        cache_efficiency: cacheEfficiency,
        score_statistics: scoreStatistics,
        timestamp: new Date().toISOString(),
        recommendation: generateCacheRecommendation(cacheEfficiency, scoreStatistics)
      };
    } catch (error) {
      console.error('Error getting cache statistics:', error);
      throw error;
    }
  }
}

/**
 * Helper function to generate cache optimization recommendations
 */
function generateCacheRecommendation(cacheEfficiency, scoreStatistics) {
  const hitRate = parseFloat(cacheEfficiency.cache_hit_rate || 0);

  if (hitRate < 30) {
    return 'Low cache hit rate. Consider increasing cache expiry duration or optimizing cache invalidation logic.';
  } else if (hitRate < 60) {
    return 'Moderate cache hit rate. Cache is being used but could be more efficient. Monitor cache invalidation patterns.';
  } else if (hitRate < 85) {
    return 'Good cache hit rate. Cache is performing well. Continue monitoring performance.';
  } else {
    return 'Excellent cache hit rate! Cache is highly effective and reducing unnecessary AI calls.';
  }
}

module.exports = AIAnalysisService;
