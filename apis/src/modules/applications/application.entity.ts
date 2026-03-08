import {
    Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../users/user.entity';
import { Job } from '../jobs/job.entity';

export enum ApplicationStatus {
    PENDING = 'pending',
    REVIEWED = 'reviewed',
    SHORTLISTED = 'shortlisted',
    INTERVIEW_SCHEDULED = 'interview_scheduled',
    HIRED = 'hired',
    REJECTED = 'rejected',
}

@Entity('applications')
export class Application {
    @ApiProperty() @PrimaryGeneratedColumn('uuid') id: string;
    @Column() candidateId: string;
    @ManyToOne(() => User) @JoinColumn({ name: 'candidateId' }) candidate: User;
    @Column() jobId: string;
    @ManyToOne(() => Job) @JoinColumn({ name: 'jobId' }) job: Job;
    @ApiProperty({ enum: ApplicationStatus }) @Column({ type: 'enum', enum: ApplicationStatus, default: ApplicationStatus.PENDING }) status: ApplicationStatus;
    @ApiProperty() @Column({ nullable: true, type: 'text' }) coverLetter: string;
    @ApiProperty() @Column({ nullable: true }) resumeUrl: string;
    @ApiProperty() @Column({ nullable: true, type: 'float' }) aiScore: number;
    @ApiProperty() @Column({ nullable: true, type: 'jsonb' }) aiAnalysisData: any;
    @ApiProperty() @Column({ nullable: true }) aiAnalyzedAt: Date;
    @ApiProperty() @Column({ nullable: true, type: 'text' }) recruiterNotes: string;
    @ApiProperty() @CreateDateColumn() createdAt: Date;
    @ApiProperty() @UpdateDateColumn() updatedAt: Date;
}
