const { GoogleGenerativeAI } = require('@google/genai');

class AIQuestionGeneratorService {
    constructor() {
        // Initialize Gemini AI (you can also use OpenAI if preferred)
        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
        } else {
            console.warn('⚠️  No Gemini API key found. AI question generation will not work.');
            this.genAI = null;
        }
    }

    /**
     * Generate interview questions based on topic and job details
     * @param {string} topic - Interview topic (e.g., "React Developer", "Data Science")
     * @param {Object} jobDetails - Job details including title, description, skills
     * @param {number} questionCount - Number of questions to generate
     * @returns {Promise<Array>} - Array of question objects
     */
    async generateInterviewQuestions(topic, jobDetails = {}, questionCount = 10) {
        try {
            if (!this.genAI) {
                console.warn('⚠️  Gemini AI not initialized. Returning fallback questions.');
                return this.getFallbackQuestions().slice(0, questionCount);
            }

            console.log('🤖 Generating AI interview questions...');
            console.log('Topic:', topic);
            console.log('Question count:', questionCount);

            const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });

            const prompt = this.buildPrompt(topic, jobDetails, questionCount);

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            console.log('Raw AI response:', text);

            // Parse the JSON response
            const questions = this.parseQuestionsFromResponse(text);

            console.log(`✅ Generated ${questions.length} questions`);

            return questions;
        } catch (error) {
            console.error('❌ AI question generation error:', error);
            throw new Error(`Question generation failed: ${error.message}`);
        }
    }

    /**
     * Build the prompt for AI question generation
     * @param {string} topic - Interview topic
     * @param {Object} jobDetails - Job details
     * @param {number} questionCount - Number of questions
     * @returns {string} - Formatted prompt
     */
    buildPrompt(topic, jobDetails, questionCount) {
        const { job_title, job_description, required_skills, experience_level } = jobDetails;

        return `You are an expert technical interviewer. Generate ${questionCount} high-quality interview questions for the following:

**Topic**: ${topic}
${job_title ? `**Job Title**: ${job_title}` : ''}
${job_description ? `**Job Description**: ${job_description}` : ''}
${required_skills ? `**Required Skills**: ${required_skills.join(', ')}` : ''}
${experience_level ? `**Experience Level**: ${experience_level}` : ''}

**Instructions**:
1. Create a mix of question types: technical (40%), behavioral (30%), situational (20%), and general (10%)
2. Questions should be relevant to the topic and job requirements
3. Vary difficulty levels appropriately for the experience level
4. Each question should be clear, concise, and interview-appropriate
5. Include expected answer duration in seconds (60-180 seconds per question)

**Output Format** (JSON array):
[
  {
    "question_text": "Question here?",
    "question_type": "technical|behavioral|situational|general",
    "expected_duration_seconds": 120,
    "order_index": 0
  }
]

Generate exactly ${questionCount} questions. Return ONLY the JSON array, no additional text.`;
    }

    /**
     * Parse questions from AI response
     * @param {string} responseText - Raw AI response
     * @returns {Array} - Parsed questions array
     */
    parseQuestionsFromResponse(responseText) {
        try {
            // Remove markdown code blocks if present
            let cleanedText = responseText.trim();

            // Remove ```json and ``` markers
            cleanedText = cleanedText.replace(/```json\s*/g, '');
            cleanedText = cleanedText.replace(/```\s*/g, '');

            // Find JSON array
            const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error('No JSON array found in response');
            }

            const questions = JSON.parse(jsonMatch[0]);

            // Validate and normalize questions
            return questions.map((q, index) => ({
                question_text: q.question_text || q.question || '',
                question_type: this.normalizeQuestionType(q.question_type || q.type || 'general'),
                expected_duration_seconds: q.expected_duration_seconds || q.duration || 120,
                order_index: q.order_index !== undefined ? q.order_index : index
            }));
        } catch (error) {
            console.error('Failed to parse AI response:', error);
            // Return fallback questions if parsing fails
            return this.getFallbackQuestions();
        }
    }

    /**
     * Normalize question type to match enum
     * @param {string} type - Question type from AI
     * @returns {string} - Normalized type
     */
    normalizeQuestionType(type) {
        const normalized = type.toLowerCase();
        const validTypes = ['technical', 'behavioral', 'situational', 'general'];

        if (validTypes.includes(normalized)) {
            return normalized;
        }

        // Map common variations
        if (normalized.includes('tech')) return 'technical';
        if (normalized.includes('behav')) return 'behavioral';
        if (normalized.includes('situat')) return 'situational';

        return 'general';
    }

    /**
     * Get fallback questions if AI generation fails
     * @returns {Array} - Fallback questions
     */
    getFallbackQuestions() {
        return [
            {
                question_text: "Tell me about yourself and your background.",
                question_type: "general",
                expected_duration_seconds: 120,
                order_index: 0
            },
            {
                question_text: "What interests you about this position?",
                question_type: "behavioral",
                expected_duration_seconds: 90,
                order_index: 1
            },
            {
                question_text: "Describe a challenging project you've worked on and how you overcame obstacles.",
                question_type: "behavioral",
                expected_duration_seconds: 150,
                order_index: 2
            },
            {
                question_text: "What are your greatest strengths and how do they apply to this role?",
                question_type: "general",
                expected_duration_seconds: 120,
                order_index: 3
            },
            {
                question_text: "Where do you see yourself in 5 years?",
                question_type: "general",
                expected_duration_seconds: 90,
                order_index: 4
            }
        ];
    }

    /**
     * Generate questions for specific technical topics
     * @param {string} technology - Specific technology (e.g., "React", "Python", "AWS")
     * @param {number} questionCount - Number of questions
     * @returns {Promise<Array>} - Array of technical questions
     */
    async generateTechnicalQuestions(technology, questionCount = 5) {
        const jobDetails = {
            job_title: `${technology} Developer`,
            required_skills: [technology]
        };

        return this.generateInterviewQuestions(technology, jobDetails, questionCount);
    }
    /**
     * Generate course exam questions (5 MCQs)
     * @param {string} topic - Course topic/skill
     * @returns {Promise<Array>} - Array of 5 MCQs
     */
    async generateCourseExamQuestions(topic) {
        try {
            if (!this.genAI) {
                // Fallback if AI not available
                return this.getFallbackExamQuestions(topic);
            }

            const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });

            const prompt = `Generate a mini-exam with exactly 5 unique Multiple Choice Questions (MCQs) to test knowledge on: "${topic}".
            
            Requirements:
            - 5 questions total.
            - Mixed difficulty (2 easy, 2 medium, 1 hard).
            - 4 options per question.
            - Clearly mark the correct answer index (0-3).
            
            Output strictly as this JSON array:
            [
              {
                "id": 1,
                "question": "Question text here?",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correctAnswer": 0
              }
            ]
            
            Return ONLY the valid JSON array. No markdown code blocks.`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text().replace(/```json|```/g, '').trim();

            return JSON.parse(text);

        } catch (error) {
            console.error('Exam generation error:', error);
            return this.getFallbackExamQuestions(topic);
        }
    }

    getFallbackExamQuestions(topic) {
        return [
            {
                id: 1,
                question: `What is a core concept of ${topic}?`,
                options: ["Concept A", "Concept B", "Concept C", "Concept D"],
                correctAnswer: 0
            },
            {
                id: 2,
                question: `Why is ${topic} used?`,
                options: ["Efficiency", "Legacy support", "Decoration", "None of these"],
                correctAnswer: 0
            },
            {
                id: 3,
                question: "Which feature is essential?",
                options: ["Feature X", "Feature Y", "Feature Z", "All of them"],
                correctAnswer: 3
            },
            {
                id: 4,
                question: "Best practice for beginners?",
                options: ["Start complex", "Read docs", "Skip basics", "Copy code"],
                correctAnswer: 1
            },
            {
                id: 5,
                question: "True or False: This is difficult.",
                options: ["True", "False", "Maybe", "Depends"],
                correctAnswer: 3
            }
        ];
    }
}

module.exports = new AIQuestionGeneratorService();
