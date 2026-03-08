import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiInterview } from '../interviews/interview.entity';
import { Job } from '../jobs/job.entity';
import { CandidateProfile, CandidateSkill } from '../profiles/profile.entity';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
    imports: [TypeOrmModule.forFeature([AiInterview, Job, CandidateProfile, CandidateSkill])],
    controllers: [AiController],
    providers: [AiService],
    exports: [AiService],
})
export class AiModule { }
