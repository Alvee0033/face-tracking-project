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

  /**
   * Saves a job for a user or adds it to their interested list.
   * @param userId User ID
   * @param jobId Job ID
   * @param type 'saved' or 'interested'
   * @returns The created record
   */
  async save(userId: string, jobId: string, type: string = 'saved'): Promise<SavedJob> {
    const existing = await this.repo.exists({ where: { userId, jobId, type } });
    if (existing) throw new ConflictException('Job already ' + type);
    return this.repo.save(this.repo.create({ userId, jobId, type }));
  }

  /**
   * Removes a job from a user's saved or interested list.
   * @param userId User ID
   * @param jobId Job ID
   * @param type 'saved' or 'interested'
   * @returns Success message
   */
  async remove(userId: string, jobId: string, type: string = 'saved'): Promise<{ message: string }> {
    await this.repo.delete({ userId, jobId, type });
    return { message: `Job removed from ${type}` };
  }

  /**
   * Finds all saved or interested jobs for a user.
   * @param userId User ID
   * @param type 'saved' or 'interested'
   * @returns List of jobs
   */
  async findAll(userId: string, type: string = 'saved'): Promise<any[]> {
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

  /**
   * Checks whether a job is saved or interested by a user.
   * @param userId User ID
   * @param jobId Job ID
   * @returns Status object
   */
  async checkStatus(userId: string, jobId: string): Promise<{ isSaved: boolean; isInterested: boolean }> {
    const saved = await this.repo.exists({ where: { userId, jobId, type: 'saved' } });
    const interested = await this.repo.exists({ where: { userId, jobId, type: 'interested' } });
    return {
      isSaved: saved,
      isInterested: interested
    };
  }

  /**
   * Generates a learning roadmap based on user's interested jobs and current skills.
   * @param userId User ID
   * @returns AI generated learning roadmap
   */
  async getLearningRoadmap(userId: string): Promise<any> {
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
