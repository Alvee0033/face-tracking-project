import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { Job, JobStatus } from './job.entity';
import { CreateJobDto, UpdateJobDto } from './dto/job.dto';

@Injectable()
export class JobsService {
    constructor(@InjectRepository(Job) private repo: Repository<Job>) { }

    async create(recruiterId: string, dto: CreateJobDto) {
        const job = this.repo.create({ ...dto, recruiterId });
        return this.repo.save(job);
    }

    async findAll(query: { search?: string; jobType?: string; country?: string; experienceLevel?: string; page?: number; limit?: number }) {
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

    async findOne(id: string) {
        const job = await this.repo.findOne({ where: { id }, relations: ['recruiter'] });
        if (!job) throw new NotFoundException('Job not found');
        await this.repo.update(id, { viewCount: () => '"viewCount" + 1' });
        return job;
    }

    async findByRecruiter(recruiterId: string) {
        return this.repo.find({ where: { recruiterId }, order: { createdAt: 'DESC' } });
    }

    async update(id: string, recruiterId: string, dto: UpdateJobDto) {
        const job = await this.repo.findOne({ where: { id } });
        if (!job) throw new NotFoundException('Job not found');
        if (job.recruiterId !== recruiterId) throw new ForbiddenException();
        Object.assign(job, dto);
        return this.repo.save(job);
    }

    async remove(id: string, recruiterId: string) {
        const job = await this.repo.findOne({ where: { id } });
        if (!job) throw new NotFoundException('Job not found');
        if (job.recruiterId !== recruiterId) throw new ForbiddenException();
        await this.repo.remove(job);
        return { message: 'Job deleted successfully' };
    }

    async getStats() {
        const total = await this.repo.count();
        const open = await this.repo.count({ where: { status: JobStatus.OPEN } });
        return { total, open, closed: total - open };
    }
}
