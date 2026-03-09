import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { Job, JobStatus } from './job.entity';
import { CreateJobDto, UpdateJobDto } from './dto/job.dto';

@Injectable()
export class JobsService {
    constructor(@InjectRepository(Job) private repo: Repository<Job>) { }

    /**
     * Creates a new job listing.
     * @param recruiterId The ID of the recruiter creating the job
     * @param dto The job details
     * @returns The newly created job
     */
    async create(recruiterId: string, dto: CreateJobDto): Promise<Job> {
        const job = this.repo.create({ ...dto, recruiterId });
        return this.repo.save(job);
    }

    /**
     * Retrieves all open jobs with optional filtering and pagination.
     * @param query The filter and pagination options
     * @returns Paginated list of jobs
     */
    async findAll(query: { search?: string; jobType?: string; country?: string; experienceLevel?: string; page?: number; limit?: number }): Promise<{ data: Job[]; total: number; page: number; limit: number; totalPages: number }> {
        const { search, jobType, country, experienceLevel, page = 1, limit = 20 } = query;
        const qb = this.repo.createQueryBuilder('job')
            .leftJoinAndSelect('job.recruiter', 'recruiter')
            .where('job.status = :status', { status: JobStatus.OPEN });

        if (search) qb.andWhere('(job.title ILIKE :search OR job.description ILIKE :search)', { search: `%${search}%` });
        if (jobType) qb.andWhere('job.jobType = :jobType', { jobType });
        if (country) qb.andWhere('job.country ILIKE :country', { country: `%${country}%` });
        if (experienceLevel) qb.andWhere('job.experienceLevel = :experienceLevel', { experienceLevel });

        qb.orderBy('job.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

        const [data, total] = await qb.getManyAndCount();
        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    /**
     * Retrieves a job by ID and increments its view count.
     * @param id The job ID
     * @returns The job object
     */
    async findOne(id: string): Promise<Job> {
        const job = await this.repo.findOne({ where: { id }, relations: ['recruiter'] });
        if (!job) throw new NotFoundException('Job not found');
        await this.repo.update(id, { viewCount: () => '"viewCount" + 1' });
        return job;
    }

    /**
     * Retrieves all jobs created by a specific recruiter.
     * @param recruiterId The recruiter's ID
     * @returns List of jobs
     */
    async findByRecruiter(recruiterId: string): Promise<Job[]> {
        return this.repo.find({ where: { recruiterId }, order: { createdAt: 'DESC' } });
    }

    /**
     * Updates an existing job listing.
     * @param id The job ID
     * @param recruiterId The recruiter's ID making the request
     * @param dto The fields to update
     * @returns The updated job
     */
    async update(id: string, recruiterId: string, dto: UpdateJobDto): Promise<Job> {
        const job = await this.repo.findOne({ where: { id } });
        if (!job) throw new NotFoundException('Job not found');
        if (job.recruiterId !== recruiterId) throw new ForbiddenException('You can only update your own jobs');
        Object.assign(job, dto);
        return this.repo.save(job);
    }

    /**
     * Deletes a job listing.
     * @param id The job ID
     * @param recruiterId The recruiter's ID making the request
     * @returns A success message
     */
    async remove(id: string, recruiterId: string): Promise<{ message: string }> {
        const job = await this.repo.findOne({ where: { id } });
        if (!job) throw new NotFoundException('Job not found');
        if (job.recruiterId !== recruiterId) throw new ForbiddenException('You can only delete your own jobs');
        await this.repo.remove(job);
        return { message: 'Job deleted successfully' };
    }

    /**
     * Retrieves job statistics.
     * @returns Statistics object including total, open, and closed counts
     */
    async getStats(): Promise<{ total: number; open: number; closed: number }> {
        const statsQuery = await this.repo.createQueryBuilder('job')
            .select('COUNT(job.id)', 'total')
            .addSelect(`SUM(CASE WHEN job.status = '${JobStatus.OPEN}' THEN 1 ELSE 0 END)`, 'open')
            .getRawOne();

        const total = parseInt(statsQuery.total, 10) || 0;
        const open = parseInt(statsQuery.open, 10) || 0;

        return { total, open, closed: total - open };
    }
}
