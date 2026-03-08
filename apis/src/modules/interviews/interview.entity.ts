import {
    Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Application } from '../applications/application.entity';

export enum InterviewStatus {
    SCHEDULED = 'scheduled',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
    NO_SHOW = 'no_show',
}

@Entity('interviews')
export class Interview {
    @PrimaryGeneratedColumn('uuid') id: string;
    @Column() recruiterId: string;
    @ManyToOne(() => User) @JoinColumn({ name: 'recruiterId' }) recruiter: User;
    @Column() candidateId: string;
    @ManyToOne(() => User) @JoinColumn({ name: 'candidateId' }) candidate: User;
    @Column({ nullable: true }) applicationId: string;
    @ManyToOne(() => Application) @JoinColumn({ name: 'applicationId' }) application: Application;
    @Column() scheduledAt: Date;
    @Column({ type: 'enum', enum: InterviewStatus, default: InterviewStatus.SCHEDULED }) status: InterviewStatus;
    @Column({ nullable: true }) title: string;
    @Column({ nullable: true, type: 'text' }) description: string;
    @Column({ nullable: true }) meetingLink: string;
    @Column({ nullable: true }) channelName: string;
    @Column({ nullable: true, type: 'text' }) notes: string;
    @CreateDateColumn() createdAt: Date;
    @UpdateDateColumn() updatedAt: Date;
}

@Entity('ai_interviews')
export class AiInterview {
    @PrimaryGeneratedColumn('uuid') id: string;
    @Column() userId: string;
    @ManyToOne(() => User) @JoinColumn({ name: 'userId' }) user: User;
    @Column({ nullable: true }) jobTitle: string;
    @Column({ nullable: true }) jobDescription: string;
    @Column({ default: false }) isCompleted: boolean;
    @Column({ nullable: true, type: 'float' }) overallScore: number;
    @Column({ nullable: true, type: 'jsonb' }) questions: any[];
    @Column({ nullable: true, type: 'jsonb' }) answers: any[];
    @Column({ nullable: true, type: 'jsonb' }) feedback: any;
    @CreateDateColumn() createdAt: Date;
    @UpdateDateColumn() updatedAt: Date;
}
