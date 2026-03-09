import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiInterview } from '../interviews/interview.entity';
import { Job } from '../jobs/job.entity';
import { CandidateProfile, CandidateSkill } from '../profiles/profile.entity';

@Injectable()
export class AiService {
    private groq: Groq;

    constructor(
        @InjectRepository(AiInterview) private aiInterviewRepo: Repository<AiInterview>,
        @InjectRepository(Job) private jobRepo: Repository<Job>,
        @InjectRepository(CandidateProfile) private profileRepo: Repository<CandidateProfile>,
        @InjectRepository(CandidateSkill) private skillRepo: Repository<CandidateSkill>,
        private config: ConfigService,
    ) {
        this.groq = new Groq({ apiKey: config.get('GROQ_API_KEY') });
    }

    async analyzeMatch(userId: string, jobId: string) {
        try {
            const job = await this.jobRepo.findOne({ where: { id: jobId } });
            if (!job) throw new Error('Job not found');

            const profile = await this.profileRepo.findOne({ where: { userId } });
            if (!profile) throw new Error('Profile not found');

            const skills = await this.skillRepo.find({ where: { candidateProfileId: profile.id } });

            const prompt = `Analyze the skill match between a candidate and a job.
Candidate Skills: ${skills.map(s => s.skillName).join(', ')}
Candidate Bio: ${profile.bio || 'Not provided'}
Job Requirements: ${(job.requiredSkills || []).join(', ')}
Job Description: ${job.description}

Return JSON strictly matching this schema:
{
  "analysis": {
    "match_percentage": <0-100>,
    "matching_skills": [ { "skill": "...", "candidate_level": "...", "job_requirement": "...", "match_quality": "high|medium|low" } ],
    "missing_skills": [ { "skill": "...", "job_requirement": "...", "importance": "high|medium|low" } ],
    "overall_assessment": "..."
  }
}`;

            const response = await this.groq.chat.completions.create({
                model: 'llama-3.2-3b-preview',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' },
            });

            let result;
            try {
                result = JSON.parse(response.choices[0].message.content);
                // Ensure it's wrapped in { analysis: ... } as expected by the frontend
                if (!result.analysis && result.match_percentage !== undefined) {
                    result = { analysis: result };
                }
            } catch (e) {
                console.error("Failed to parse AI Match Analysis", e);
                throw new Error("Invalid AI response");
            }

            return result;
        } catch (error) {
            console.error('AI Match Analysis Error:', error);
            throw error;
        }
    }

    async getSkillRecommendations(userId: string, jobId: string) {
        try {
            const job = await this.jobRepo.findOne({ where: { id: jobId } });
            if (!job) throw new Error('Job not found');

            const profile = await this.profileRepo.findOne({ where: { userId } });
            if (!profile) throw new Error('Profile not found');

            const skills = await this.skillRepo.find({ where: { candidateProfileId: profile.id } });

            const prompt = `Analyze the missing skills between a candidate and a job. Provide specific learning recommendations.
Candidate Skills: ${skills.map(s => s.skillName).join(', ')}
Job Requirements: ${(job.requiredSkills || []).join(', ')}

Return a JSON with "recommendations" array containing objects with:
{
  "recommendations": [
    {
      "skill": "...", 
      "learning_path": "...", 
      "resources": ["...", "..."], 
      "difficulty": "beginner|intermediate|advanced",
      "estimated_time": "..."
    }
  ]
}`;
            const response = await this.groq.chat.completions.create({
                model: 'llama-3.2-3b-preview',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' },
            });
            return JSON.parse(response.choices[0].message.content);
        } catch (error) {
            console.error('Skill recommendations error:', error);
            throw error;
        }
    }

    async analyzeResume(resumeText: string, jobDescription: string) {
        const response = await this.groq.chat.completions.create({
            model: 'llama-3.2-3b-preview',
            messages: [{
                role: 'user',
                content: `You are an expert HR analyst. Analyze this candidate's resume against the job description and provide a detailed assessment.
Resume: ${resumeText.substring(0, 3000)}
Job Description: ${jobDescription.substring(0, 1500)}
Return JSON with { "compatibility_score": 85, "strengths": [], "skill_gaps": [], "keyword_match": [], "recommendation": "", "improvements": [] }`,
            }],
            response_format: { type: 'json_object' },
        });
        return JSON.parse(response.choices[0].message.content);
    }

    async generateInterviewQuestions(jobTitle: string, jobDescription: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium') {
        const response = await this.groq.chat.completions.create({
            model: 'llama3-70b-8192',
            messages: [{
                role: 'user',
                content: `Generate 10 ${difficulty} interview questions for a ${jobTitle} position.
Job context: ${jobDescription?.substring(0, 1000)}
Return JSON with { questions: [{ id, question, category, expectedAnswer, tips }] }`,
            }],
            response_format: { type: 'json_object' },
        });
        return JSON.parse(response.choices[0].message.content);
    }

    async startAiInterview(userId: string, jobTitle: string, jobDescription: string) {
        const questions = await this.generateInterviewQuestions(jobTitle, jobDescription);
        const session = this.aiInterviewRepo.create({
            userId,
            jobTitle,
            jobDescription,
            questions: questions.questions,
            answers: [],
        });
        return this.aiInterviewRepo.save(session);
    }

    async submitAnswer(sessionId: string, questionId: string, answer: string) {
        const session = await this.aiInterviewRepo.findOne({ where: { id: sessionId } });
        if (!session) throw new Error('Session not found');

        const question = session.questions?.find((q: any) => q.id === questionId);
        const feedback = await this.evaluateAnswer(question?.question, answer, question?.expectedAnswer);

        const answers = Array.isArray(session.answers) ? session.answers : [];
        answers.push({ questionId, question: question?.question, answer, feedback, score: feedback.score });
        session.answers = answers;

        const answered = answers.length;
        const total = session.questions?.length || 10;
        if (answered >= total) {
            session.isCompleted = true;
            session.overallScore = answers.reduce((s: number, a: any) => s + (a.score || 0), 0) / answered;
            session.feedback = await this.generateOverallFeedback(answers);
        }

        return this.aiInterviewRepo.save(session);
    }

    private async evaluateAnswer(question: string, answer: string, expectedAnswer: string) {
        const response = await this.groq.chat.completions.create({
            model: 'llama3-8b-8192',
            messages: [{
                role: 'user',
                content: `Evaluate this interview answer:
Question: ${question}
Expected: ${expectedAnswer}
Answer: ${answer}
Return JSON: { score (0-10), feedback, strengths, improvements }`,
            }],
            response_format: { type: 'json_object' },
        });
        return JSON.parse(response.choices[0].message.content);
    }

    private async generateOverallFeedback(answers: any[]) {
        const summary = answers.map((a: any) => `Q: ${a.question} | Score: ${a.score}/10`).join('\n');
        const response = await this.groq.chat.completions.create({
            model: 'llama3-8b-8192',
            messages: [{
                role: 'user',
                content: `Based on this interview session, provide overall feedback:
${summary}
Return JSON: { overall_assessment, strengths, areas_for_improvement, hiring_recommendation, tips }`,
            }],
            response_format: { type: 'json_object' },
        });
        return JSON.parse(response.choices[0].message.content);
    }

    async getSession(sessionId: string) {
        return this.aiInterviewRepo.findOne({ where: { id: sessionId } });
    }

    async getUserSessions(userId: string) {
        return this.aiInterviewRepo.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            select: ['id', 'jobTitle', 'isCompleted', 'overallScore', 'createdAt'],
        });
    }
    async generateRoadmap(userId: string) {
        const profile = await this.profileRepo.findOne({ where: { userId } });
        if (!profile) throw new Error('Profile not found');

        const skills = await this.skillRepo.find({ where: { candidateProfileId: profile.id } });

        // Fetch interested jobs to base the roadmap on
        // Note: SavedJobsService can be circular, so we might want to pass the jobs in or use TypeORM repository directly
        // For simplicity, let's just query the repository directly if we can
        // But better to pass them in from the controller/service that calls this
        return { message: 'Use generateRoadmapWithData instead' };
    }

    async generateRoadmapWithData(profile: any, skills: any[], interestedJobs: any[]) {
        const jobContext = interestedJobs.map(j => `${j.title} at ${j.company}: ${j.description?.substring(0, 300)}`).join('\n---\n');

        const prompt = `You are an expert career coach and learning path architect.
Based on the candidate's profile and the jobs they are interested in, generate a comprehensive learning roadmap to bridge their skill gaps.

Candidate Skills: ${skills.map(s => s.skillName).join(', ')}
Candidate Bio: ${profile.bio || 'Not provided'}
Interested Jobs:
${jobContext}

Return a detailed JSON object for a "roadmap" comprising:
{
  "summary": "...",
  "total_skills_needed": <number>,
  "total_time_estimate": "e.g., 6-12 months",
  "skill_gap_analysis": {
    "new_skills_needed": ["..."],
    "skills_to_upgrade": [ { "skill": "...", "current_level": "...", "target_level": "..." } ],
    "skills_already_sufficient": ["..."]
  },
  "career_paths": [ { "role": "...", "readiness_percentage": <0-100>, "required_phases": [1, 2] } ],
  "learning_phases": [
    {
      "phase": 1,
      "title": "...",
      "duration": "e.g., 4 weeks",
      "description": "...",
      "skills": [
        {
          "skill": "...",
          "category": "...",
          "difficulty": "Beginner|Intermediate|Advanced",
          "time_estimate": "...",
          "learning_path": "...",
          "resources": ["..."]
        }
      ]
    }
  ]
}`;

        const response = await this.groq.chat.completions.create({
            model: 'llama-3.2-3b-preview',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
        });

        return JSON.parse(response.choices[0].message.content);
    }

    async generateSkillExamQuestions(skillName: string) {
        const prompt = `Generate a 5-question multiple-choice technical exam for the skill: ${skillName}.
        Difficulty: Intermediate.
        Return strictly valid JSON with: { "questions": [{ "id": "q1", "question": "...", "options": { "A": "...", "B": "...", "C": "...", "D": "..." }, "correctAnswer": "A", "explanation": "..." }] }`;

        const models = ['llama-3.2-3b-preview', 'llama-3.1-8b-instant', 'llama-3.3-70b-versatile'];

        for (const model of models) {
            try {
                console.log(`Attempting exam generation with model: ${model}`);
                const response = await this.groq.chat.completions.create({
                    model,
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: 'json_object' },
                });

                const content = response.choices[0].message.content;
                const parsed = JSON.parse(content);

                if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
                    // Success! Validate first question structure
                    if (parsed.questions[0].options && typeof parsed.questions[0].options === 'object') {
                        console.log(`Successfully generated exam with ${model}`);
                        return parsed;
                    }
                }
                console.warn(`Model ${model} returned invalid structure, trying next...`);
            } catch (error) {
                console.warn(`Model ${model} failed: ${error.message}`);
            }
        }

        throw new Error('All AI models failed to generate a valid exam. This may be due to high traffic or specific skill complexity. Please try again in 1 minute.');
    }

    /**
     * Evaluates a user's answers to a skill exam.
     * @param skillName The name of the skill
     * @param answers Array of user answers
     * @param questions Array of original questions
     * @returns The exam results including score and pass status
     */
    async evaluateSkillExam(skillName: string, answers: any[], questions: any[]): Promise<{ score: number; passed: boolean; correctCount: number; totalQuestions: number }> {
        let correctCount = 0;
        answers.forEach((ans: any) => {
            // Support both questionId (if sent) and questionIndex (if sent)
            const index = ans.questionIndex;
            const q = questions[index];
            if (q && q.correctAnswer === ans.answer) {
                correctCount++;
            }
        });

        const score = (correctCount / questions.length) * 100;
        const passed = score >= 70;

        return { score, passed, correctCount, totalQuestions: questions.length };
    }
}
