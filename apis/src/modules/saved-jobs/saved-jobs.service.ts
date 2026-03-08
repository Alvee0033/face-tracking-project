import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedJob } from '../community/community.entity';
import { CandidateProfile, CandidateSkill } from '../profiles/profile.entity';
import { AiService } from '../ai/ai.service';

@Injectable()
export class SavedJobsService {
  constructor(
    @InjectRepository(SavedJob) private repo: Repository<SavedJob>,
    @InjectRepository(CandidateProfile) private profileRepo: Repository<CandidateProfile>,
    @InjectRepository(CandidateSkill) private skillRepo: Repository<CandidateSkill>,
    private aiService: AiService
  ) { }

  async save(userId: string, jobId: string, type: string = 'saved') {
    const existing = await this.repo.findOne({ where: { userId, jobId, type } });
    if (existing) throw new ConflictException('Job already ' + type);
    return this.repo.save(this.repo.create({ userId, jobId, type }));
  }

  async remove(userId: string, jobId: string, type: string = 'saved') {
    await this.repo.delete({ userId, jobId, type });
    return { message: `Job removed from ${type}` };
  }

  async findAll(userId: string, type: string = 'saved') {
    const list = await this.repo.find({ where: { userId, type }, relations: ['job', 'job.recruiter'] });
    return list.map(item => {
      const j = item.job as any;
      if (!j) return item;
      return {
        ...item,
        jobs: {
          ...j,
          job_title: j.title || j.job_title,
          recruiter_profiles: {
            company_name: j.company || (j.recruiter ? j.recruiter.companyName : null) || 'Unknown Company',
            company_logo_url: j.companyLogo || (j.recruiter ? j.recruiter.profileImage : null)
          }
        }
      };
    });
  }

  async checkStatus(userId: string, jobId: string) {
    const saved = await this.repo.findOne({ where: { userId, jobId, type: 'saved' } });
    const interested = await this.repo.findOne({ where: { userId, jobId, type: 'interested' } });
    return {
      isSaved: !!saved,
      isInterested: !!interested
    };
  }

  async getLearningRoadmap(userId: string) {
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Profile not found. Please create your profile first');

    const skills = await this.skillRepo.find({ where: { candidateProfileId: profile.id } });
    const interestedJobs = await this.repo.find({
      where: { userId, type: 'interested' },
      relations: ['job']
    });

    if (!interestedJobs.length) {
      throw new NotFoundException('No interested jobs found. Add some jobs to your interested list to generate a roadmap');
    }

    // Extract job details safely
    const jobsData = interestedJobs.map(item => ({
      title: item.job?.title,
      company: item.job?.company,
      description: item.job?.description
    })).filter(j => j.title);

    const roadmap = await this.aiService.generateRoadmapWithData(profile, skills, jobsData);
    return roadmap;
  }
}
