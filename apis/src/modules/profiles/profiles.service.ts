import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CandidateProfile, RecruiterProfile, CandidateSkill, CandidateExperience, CandidateEducation, CandidateProject, CandidateCertification, JobPreferences } from './profile.entity';
import { User } from '../users/user.entity';
import { AiService } from '../ai/ai.service';

@Injectable()
export class ProfilesService {
    // In-memory store for active exams (for demo purposes, real app would use DB or Redis)
    private activeExams = new Map<string, any>();

    constructor(
        @InjectRepository(CandidateProfile) private candidateRepo: Repository<CandidateProfile>,
        @InjectRepository(RecruiterProfile) private recruiterRepo: Repository<RecruiterProfile>,
        @InjectRepository(CandidateSkill) private skillRepo: Repository<CandidateSkill>,
        @InjectRepository(CandidateExperience) private expRepo: Repository<CandidateExperience>,
        @InjectRepository(CandidateEducation) private eduRepo: Repository<CandidateEducation>,
        @InjectRepository(CandidateProject) private projectRepo: Repository<CandidateProject>,
        @InjectRepository(CandidateCertification) private certRepo: Repository<CandidateCertification>,
        @InjectRepository(JobPreferences) private jobPrefsRepo: Repository<JobPreferences>,
        @InjectRepository(User) private userRepo: Repository<User>,
        private aiService: AiService,
    ) { }

    async getCandidateProfile(userId: string) {
        let profile = await this.candidateRepo.findOne({
            where: { userId },
            relations: ['user', 'skills', 'experience', 'education', 'projects', 'certifications', 'jobPreferences']
        });

        if (!profile) {
            profile = await this.candidateRepo.save(this.candidateRepo.create({ userId }));
            // Reload with relations
            profile = await this.candidateRepo.findOne({
                where: { userId },
                relations: ['user', 'skills', 'experience', 'education', 'projects', 'certifications', 'jobPreferences']
            });
        }

        // Return a shape the frontend expects (profile, candidateProfile aliases)
        return {
            ...profile,
            profile: profile.user, // Alias for profiles table
            candidateProfile: profile, // Alias for candidate_profiles table
        };
    }

    async updateCandidateProfile(userId: string, dto: any) {
        const userFields = ['fullName', 'phoneNumber', 'profilePictureUrl'];
        const userUpdate: any = {};
        const profileUpdate: any = {};

        for (const key in dto) {
            if (userFields.includes(key)) userUpdate[key] = dto[key];
            else profileUpdate[key] = dto[key];
        }

        if (Object.keys(userUpdate).length > 0) {
            await this.userRepo.update(userId, userUpdate);
        }

        let existing = await this.candidateRepo.findOne({ where: { userId } });
        if (existing) {
            Object.assign(existing, profileUpdate);
            await this.candidateRepo.save(existing);
        } else {
            const newProfile = this.candidateRepo.create({ userId, ...profileUpdate } as Partial<CandidateProfile>);
            await this.candidateRepo.save(newProfile);
        }

        return this.getCandidateProfile(userId);
    }

    async getRecruiterProfile(userId: string) {
        const existing = await this.recruiterRepo.findOne({ where: { userId }, relations: ['user'] });
        return existing ?? await this.recruiterRepo.save(this.recruiterRepo.create({ userId }));
    }

    async updateRecruiterProfile(userId: string, dto: any) {
        const existing = await this.recruiterRepo.findOne({ where: { userId } });
        if (existing) { Object.assign(existing, dto); return this.recruiterRepo.save(existing); }
        return this.recruiterRepo.save(this.recruiterRepo.create({ userId, ...dto }));
    }

    // --- Skills ---
    async addSkill(userId: string, dto: any) {
        const profile = await this.candidateRepo.findOne({ where: { userId } });
        if (!profile) throw new NotFoundException('Profile not found');
        const skill = await this.skillRepo.save(this.skillRepo.create({ candidateProfileId: profile.id, ...dto, isVerified: false }));
        return { ...skill, requiresVerification: true };
    }
    async updateSkill(id: string, dto: any) {
        await this.skillRepo.update(id, { ...dto, isVerified: false });
        const skill = await this.skillRepo.findOne({ where: { id } });
        return { ...skill, requiresVerification: true };
    }
    async deleteSkill(id: string) { return this.skillRepo.delete(id); }

    async getUnverifiedSkills(userId: string) {
        const profile = await this.candidateRepo.findOne({ where: { userId } });
        if (!profile) throw new NotFoundException('Profile not found');
        const skills = await this.skillRepo.find({ where: { candidateProfileId: profile.id, isVerified: false } });
        return { unverifiedSkills: skills };
    }

    async generateSkillExam(skillId: string) {
        console.log(`Generating exam for skill ID: ${skillId}`);
        const skill = await this.skillRepo.findOne({ where: { id: skillId } });
        if (!skill) {
            console.error(`Skill with ID ${skillId} not found`);
            throw new NotFoundException('Skill not found');
        }

        console.log(`Found skill: ${skill.skillName}. Calling AI...`);
        try {
            const examData = await this.aiService.generateSkillExamQuestions(skill.skillName);
            console.log(`AI returned exam data with ${examData.questions?.length || 0} questions`);
            const examId = `exam_${Date.now()}_${skillId}`;
            this.activeExams.set(examId, { skillId, questions: examData.questions });

            return {
                exam: {
                    id: examId,
                    questions: examData.questions,
                    totalMarks: examData.questions.length,
                    passingMarks: Math.ceil(examData.questions.length * 0.7), // 70% to pass
                    skillName: skill.skillName,
                    skillLevel: skill.skillLevel
                }
            };
        } catch (error) {
            console.error(`Failed to generate exam: ${error.message}`);
            throw error;
        }
    }

    async submitSkillExam(userId: string, dto: { examId: string; answers: any[] }) {
        const exam = this.activeExams.get(dto.examId);
        if (!exam) throw new NotFoundException('Exam not found or expired');

        const skill = await this.skillRepo.findOne({ where: { id: exam.skillId } });
        if (!skill) throw new NotFoundException('Skill not found');

        const result = await this.aiService.evaluateSkillExam(skill.skillName, dto.answers, exam.questions);

        if (result.passed) {
            skill.isVerified = true;
            await this.skillRepo.save(skill);
        }

        this.activeExams.delete(dto.examId);

        return {
            success: result.passed,
            score: result.score,
            correctCount: result.correctCount,
            totalQuestions: result.totalQuestions,
            message: result.passed ? 'Congratulations! Your skill has been verified.' : 'Skill verification failed. Try again after more practice.'
        };
    }

    // --- Experience ---
    async addExperience(userId: string, dto: any) {
        const profile = await this.candidateRepo.findOne({ where: { userId } });
        if (!profile) throw new NotFoundException('Profile not found');
        return this.expRepo.save(this.expRepo.create({ candidateProfileId: profile.id, ...dto }));
    }
    async updateExperience(id: string, dto: any) {
        await this.expRepo.update(id, dto);
        return this.expRepo.findOne({ where: { id } });
    }
    async deleteExperience(id: string) { return this.expRepo.delete(id); }

    // --- Education ---
    async addEducation(userId: string, dto: any) {
        const profile = await this.candidateRepo.findOne({ where: { userId } });
        if (!profile) throw new NotFoundException('Profile not found');
        return this.eduRepo.save(this.eduRepo.create({ candidateProfileId: profile.id, ...dto }));
    }
    async updateEducation(id: string, dto: any) {
        await this.eduRepo.update(id, dto);
        return this.eduRepo.findOne({ where: { id } });
    }
    async deleteEducation(id: string) { return this.eduRepo.delete(id); }

    // --- Projects ---
    async addProject(userId: string, dto: any) {
        const profile = await this.candidateRepo.findOne({ where: { userId } });
        if (!profile) throw new NotFoundException('Profile not found');
        return this.projectRepo.save(this.projectRepo.create({ candidateProfileId: profile.id, ...dto }));
    }
    async updateProject(id: string, dto: any) {
        await this.projectRepo.update(id, dto);
        return this.projectRepo.findOne({ where: { id } });
    }
    async deleteProject(id: string) { return this.projectRepo.delete(id); }

    // --- Certifications ---
    async addCertification(userId: string, dto: any) {
        const profile = await this.candidateRepo.findOne({ where: { userId } });
        if (!profile) throw new NotFoundException('Profile not found');
        return this.certRepo.save(this.certRepo.create({ candidateProfileId: profile.id, ...dto }));
    }
    async updateCertification(id: string, dto: any) {
        await this.certRepo.update(id, dto);
        return this.certRepo.findOne({ where: { id } });
    }
    async deleteCertification(id: string) { return this.certRepo.delete(id); }

    // --- Job Preferences ---
    async updateJobPreferences(userId: string, dto: any) {
        const profile = await this.candidateRepo.findOne({ where: { userId } });
        if (!profile) throw new NotFoundException('Profile not found');

        let prefs = await this.jobPrefsRepo.findOne({ where: { candidateProfileId: profile.id } });
        if (prefs) {
            Object.assign(prefs, dto);
            return this.jobPrefsRepo.save(prefs);
        } else {
            return this.jobPrefsRepo.save(this.jobPrefsRepo.create({ candidateProfileId: profile.id, ...dto }));
        }
    }

    async listCandidates(page = 1, limit = 20) {
        const [data, total] = await this.candidateRepo.findAndCount({
            relations: ['user'],
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data, total };
    }
}
