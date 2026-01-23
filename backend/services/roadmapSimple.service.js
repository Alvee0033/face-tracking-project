const { Groq } = require('groq-sdk');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

/**
 * Generate a simplified, reliable learning roadmap
 */
async function generateSimplifiedRoadmap(candidateSkills, interestedJobs) {
    try {
        // Format skills
        const candidateSkillsList = candidateSkills.map(s => `${s.skill_name} (${s.skill_level})`).join(', ') || 'None';

        // Format jobs
        const jobsSummary = interestedJobs.map(job => {
            const requiredSkills = job.skills?.map(s => s.skill_name).join(', ') || 'Not specified';
            return `- ${job.job_title}: Requires ${requiredSkills}`;
        }).join('\\n');

        // Get all unique required skills
        const allRequiredSkills = new Set();
        interestedJobs.forEach(job => {
            if (job.skills && Array.isArray(job.skills)) {
                job.skills.forEach(skill => allRequiredSkills.add(skill.skill_name));
            }
        });
        const requiredSkillsList = Array.from(allRequiredSkills).join(', ') || 'None';

        const prompt = `Create a learning roadmap for a candidate.

CURRENT SKILLS: ${candidateSkillsList}
TARGET JOBS: ${jobsSummary}
REQUIRED SKILLS: ${requiredSkillsList}

Generate a JSON roadmap with 3 phases (Beginner, Intermediate, Advanced). Each phase needs 3-5 skills.

CRITICAL: Each skill MUST have these fields:
- skill: Clear name (e.g., "JavaScript", "React", "Node.js")
- difficulty: "Beginner", "Intermediate", or "Advanced"
- skill_type: "new" or "upgrade"  
- category: "Programming", "Framework", "Database", etc.
- time_estimate: e.g., "2 weeks"
- learning_path: Brief description (1-2 sentences)
- resources: Array of 2-3 resource names

Example skill format:
{
  "skill": "JavaScript Fundamentals",
  "difficulty": "Beginner",
  "skill_type": "new",
  "category": "Programming",
  "time_estimate": "2 weeks",
  "learning_path": "Start with ES6 syntax, then practice with coding challenges.",
  "resources": ["MDN Web Docs", "JavaScript.info", "freeCodeCamp"]
}

Return ONLY this JSON structure (no markdown):
{
  "skill_gap_analysis": {
    "new_skills_needed": ["skill1", "skill2"],
    "skills_to_upgrade": []
  },
  "learning_phases": [
    {
      "level": "Beginner",
      "phase": 1,
      "title": "Foundation Building",
      "duration": "4-6 weeks",
      "description": "Master the fundamentals",
      "skills": [...]
    },
    {
      "level": "Intermediate",
      "phase": 2,
      "title": "Practical Skills",
      "duration": "6-8 weeks",
      "description": "Build real-world applications",
      "skills": [...]
    },
    {
      "level": "Advanced",
      "phase": 3,
      "title": "Advanced Mastery",
      "duration": "8-10 weeks",
      "description": "Expert-level concepts",
      "skills": [...]
    }
  ],
  "project_ideas": {
    "beginner_projects": [{"title": "Portfolio Site", "description": "Simple HTML/CSS/JS site"}],
    "intermediate_projects": [{"title": "Todo App", "description": "React application"}],
    "advanced_projects": [{"title": "Full-stack App", "description": "Complete web app"}]
  },
  "career_paths": [{"role": "Junior Developer", "readiness_percentage": 30}],
  "total_time_estimate": "6-12 months",
  "total_skills_needed": 12,
  "summary": "Career development plan"
}`;

        const response = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: "You are a career coach. Generate simple, practical learning roadmaps. Return ONLY valid JSON, no markdown."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.5,
            max_completion_tokens: 6000,
            stream: false
        });

        let roadmap;
        try {
            const content = response.choices?.[0]?.message?.content?.trim();
            if (!content) {
                throw new Error('AI returned empty response');
            }

            // Remove markdown code blocks if present
            let jsonContent = content;
            if (content.includes('```')) {
                jsonContent = content.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
            }

            roadmap = JSON.parse(jsonContent);
            console.log('Roadmap generated successfully, phases:', roadmap.learning_phases?.length);
            console.log('First phase skills:', roadmap.learning_phases?.[0]?.skills?.length);

        } catch (parseError) {
            console.error('Failed to parse roadmap:', parseError);
            console.error('Raw AI response:', response.choices?.[0]?.message?.content?.substring(0, 500));
            throw new Error('Failed to parse roadmap from AI response');
        }

        // Ensure all required fields exist
        return {
            skill_gap_analysis: roadmap.skill_gap_analysis || {
                new_skills_needed: [],
                skills_to_upgrade: []
            },
            learning_phases: roadmap.learning_phases || [],
            project_ideas: roadmap.project_ideas || {},
            career_paths: roadmap.career_paths || [],
            total_time_estimate: roadmap.total_time_estimate || '6-12 months',
            total_skills_needed: roadmap.total_skills_needed || 0,
            summary: roadmap.summary || 'Learning roadmap generated'
        };

    } catch (error) {
        console.error('Error in generateSimplifiedRoadmap:', error);
        throw error;
    }
}

module.exports = { generateSimplifiedRoadmap };
