import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Interview } from './interview.entity';

@Injectable()
export class InterviewsService {
  constructor(@InjectRepository(Interview) private repo: Repository<Interview>) {}

  async schedule(dto: any) {
    const interview = this.repo.create(dto);
    return this.repo.save(interview);
  }

  async findByUser(userId: string) {
    return this.repo.find({
      where: [{ recruiterId: userId }, { candidateId: userId }],
      relations: ['recruiter', 'candidate'],
      order: { scheduledAt: 'ASC' },
    });
  }

  async findOne(id: string) {
    return this.repo.findOne({ where: { id }, relations: ['recruiter', 'candidate', 'application'] });
  }

  async update(id: string, dto: any) {
    await this.repo.update(id, dto);
    return this.findOne(id);
  }
}
