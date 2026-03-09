import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Interview } from './interview.entity';

@Injectable()
export class InterviewsService {
  constructor(@InjectRepository(Interview) private repo: Repository<Interview>) {}

  /**
   * Schedules a new interview.
   * @param dto Interview details
   * @returns The scheduled interview
   */
  async schedule(dto: any): Promise<any> {
    const interview = this.repo.create(dto);
    return this.repo.save(interview);
  }

  /**
   * Retrieves all interviews for a given user (either as recruiter or candidate).
   * @param userId The ID of the user
   * @returns List of interviews
   */
  async findByUser(userId: string): Promise<Interview[]> {
    return this.repo.find({
      where: [{ recruiterId: userId }, { candidateId: userId }],
      relations: ['recruiter', 'candidate'],
      order: { scheduledAt: 'ASC' },
    });
  }

  /**
   * Retrieves specific interview details by ID.
   * @param id The interview ID
   * @returns The interview object
   */
  async findOne(id: string): Promise<Interview> {
    const interview = await this.repo.findOne({ where: { id }, relations: ['recruiter', 'candidate', 'application'] });
    if (!interview) throw new NotFoundException('Interview not found');
    return interview;
  }

  /**
   * Updates an existing interview.
   * @param id The interview ID
   * @param dto Update details
   * @returns The updated interview
   */
  async update(id: string, dto: any): Promise<Interview> {
    const interview = await this.repo.findOne({ where: { id } });
    if (!interview) throw new NotFoundException('Interview not found');
    await this.repo.update(id, dto);
    return this.findOne(id);
  }
}
