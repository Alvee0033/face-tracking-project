import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CandidateProfile, RecruiterProfile, CandidateSkill, CandidateExperience, CandidateEducation, CandidateProject, CandidateCertification, JobPreferences } from './profile.entity';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { UsersModule } from '../users/users.module';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([CandidateProfile, RecruiterProfile, CandidateSkill, CandidateExperience, CandidateEducation, CandidateProject, CandidateCertification, JobPreferences]),
        UsersModule,
        AiModule
    ],
    controllers: [ProfilesController],
    providers: [ProfilesService],
    exports: [ProfilesService],
})
export class ProfilesModule { }
