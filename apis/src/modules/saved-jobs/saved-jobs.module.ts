import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SavedJob } from '../community/community.entity';
import { SavedJobsController } from './saved-jobs.controller';
import { SavedJobsService } from './saved-jobs.service';

import { CandidateProfile, CandidateSkill } from '../profiles/profile.entity';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SavedJob, CandidateProfile, CandidateSkill]),
    AiModule
  ],
  controllers: [SavedJobsController],
  providers: [SavedJobsService],
})
export class SavedJobsModule { }
