import {
    Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Job } from '../jobs/job.entity';

@Entity('community_posts')
export class CommunityPost {
    @PrimaryGeneratedColumn('uuid') id: string;
    @Column() authorId: string;
    @ManyToOne(() => User) @JoinColumn({ name: 'authorId' }) author: User;
    @Column({ nullable: true }) title: string;
    @Column({ type: 'text' }) content: string;
    @Column({ nullable: true }) category: string;
    @Column({ nullable: true }) imageUrl: string;
    @Column({ default: 0 }) likeCount: number;
    @Column({ default: 0 }) replyCount: number;
    @CreateDateColumn() createdAt: Date;
    @UpdateDateColumn() updatedAt: Date;
}

@Entity('community_replies')
export class CommunityReply {
    @PrimaryGeneratedColumn('uuid') id: string;
    @Column() postId: string;
    @Column() authorId: string;
    @ManyToOne(() => User) @JoinColumn({ name: 'authorId' }) author: User;
    @Column({ type: 'text' }) content: string;
    @CreateDateColumn() createdAt: Date;
}

@Entity('saved_jobs')
export class SavedJob {
    @PrimaryGeneratedColumn('uuid') id: string;
    @Column() userId: string;
    @ManyToOne(() => User) @JoinColumn({ name: 'userId' }) user: User;
    @Column() jobId: string;
    @ManyToOne(() => Job) @JoinColumn({ name: 'jobId' }) job: Job;
    @Column({ default: 'saved' }) type: string; // 'saved' or 'interested'
    @CreateDateColumn() createdAt: Date;
}
