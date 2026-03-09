import { IsString, IsEnum, IsOptional, IsNumber, IsArray, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { JobType, JobStatus, ExperienceLevel, WorkMode } from '../job.entity';

export class CreateJobDto {
    @ApiProperty() @IsString() title: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() category?: string;
    @ApiProperty() @IsString() description: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() requirements?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() responsibilities?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() location?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() country?: string;
    @ApiProperty({ enum: JobType, required: false }) @IsOptional() @IsEnum(JobType) jobType?: JobType;
    @ApiProperty({ enum: WorkMode, required: false }) @IsOptional() @IsEnum(WorkMode) workMode?: WorkMode;
    @ApiProperty({ enum: ExperienceLevel, required: false }) @IsOptional() @IsEnum(ExperienceLevel) experienceLevel?: ExperienceLevel;
    @ApiProperty({ required: false }) @IsOptional() @IsString() educationLevel?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsNumber() @Min(0) salaryMin?: number;
    @ApiProperty({ required: false }) @IsOptional() @IsNumber() @Min(0) salaryMax?: number;
    @ApiProperty({ required: false }) @IsOptional() @IsString() salaryCurrency?: string;
    @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() requiredSkills?: string[];
    @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() preferredSkills?: string[];
    @ApiProperty({ required: false }) @IsOptional() @IsString() applicationDeadline?: string;
}

export class UpdateJobDto extends CreateJobDto {
    @ApiProperty({ enum: JobStatus, required: false }) @IsOptional() @IsEnum(JobStatus) status?: JobStatus;
}
