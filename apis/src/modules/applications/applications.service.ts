import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application, ApplicationStatus } from './application.entity';
import { Job } from '../jobs/job.entity';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';

@Injectable()
export class ApplicationsService {
    private groq: Groq;

    constructor(
        @InjectRepository(Application) private repo: Repository<Application>,
        @InjectRepository(Job) private jobRepo: Repository<Job>,
        private config: ConfigService,
    ) {
        this.groq = new Groq({ apiKey: config.get('GROQ_API_KEY') });
    }

    async apply(candidateId: string, dto: { jobId: string; coverLetter?: string; resumeUrl?: string }) {
        const existing = await this.repo.findOne({ where: { candidateId, jobId: dto.jobId } });
        if (existing) throw new ConflictException('You have already applied to this job');

        const job = await this.jobRepo.findOne({ where: { id: dto.jobId } });
        if (!job) throw new NotFoundException('Job not found');

        const app = this.repo.create({ candidateId, ...dto });
        const saved = await this.repo.save(app);

        // Trigger AI analysis in background
        this.analyzeCompatibility(saved.id, { job }).catch(console.error);

        return saved;
    }

    async findByCandidate(candidateId: string) {
        const apps = await this.repo.find({
            where: { candidateId },
            relations: ['job', 'job.recruiter'],
            order: { createdAt: 'DESC' },
        });
        return apps.map(app => {
            const j = app.job as any;
            if (!j) return app;
            return {
                ...app,
                jobs: {
                    ...j,
                    job_title: j.title,
                    recruiter_profiles: {
                        company_name: j.company || (j.recruiter ? j.recruiter.companyName : null) || 'Unknown Company',
                        company_logo_url: j.companyLogo || (j.recruiter ? j.recruiter.profileImage : null)
                    }
                }
            };
        });
    }

    async findByJob(jobId: string, recruiterId: string) {
        const job = await this.jobRepo.findOne({ where: { id: jobId } });
        if (!job) throw new NotFoundException('Job not found');
        return this.repo.find({
            where: { jobId },
            relations: ['candidate'],
            order: { aiScore: 'DESC' },
        });
    }

    async findByRecruiter(recruiterId: string) {
        return this.repo
            .createQueryBuilder('app')
            .leftJoinAndSelect('app.job', 'job')
            .leftJoinAndSelect('app.candidate', 'candidate')
            .where('job.recruiterId = :recruiterId', { recruiterId })
            .orderBy('app.createdAt', 'DESC')
            .getMany();
    }

    async updateStatus(id: string, status: ApplicationStatus, notes?: string) {
        const app = await this.repo.findOne({ where: { id } });
        if (!app) throw new NotFoundException();
        app.status = status;
        if (notes) app.recruiterNotes = notes;
        return this.repo.save(app);
    }

    private async analyzeCompatibility(applicationId: string, data: { job: Job }) {
        try {
            const prompt = `You are an expert HR analyst. Analyze the job requirements and rate the overall compatibility score.

Job: ${data.job.title}
Description: ${data.job.description?.substring(0, 1000)}
Required Skills: ${(data.job.requiredSkills || []).join(', ')}

Provide a JSON response with:
{
  "compatibility_score": <0-100>,
  "strengths": ["..."],
  "skill_gaps": ["..."],
  "recommendation": "..."
}`;

            const response = await this.groq.chat.completions.create({
                model: 'llama3-8b-8192',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' },
            });

            const analysis = JSON.parse(response.choices[0].message.content);
            await this.repo.update(applicationId, {
                aiScore: analysis.compatibility_score,
                aiAnalysisData: analysis,
                aiAnalyzedAt: new Date(),
            });
        } catch (e) {
            console.error('AI analysis failed:', e.message);
        }
    }

    async getStats() {
        const total = await this.repo.count();
        const pending = await this.repo.count({ where: { status: ApplicationStatus.PENDING } });
        const shortlisted = await this.repo.count({ where: { status: ApplicationStatus.SHORTLISTED } });
        const hired = await this.repo.count({ where: { status: ApplicationStatus.HIRED } });
        return { total, pending, shortlisted, hired };
    }
}
