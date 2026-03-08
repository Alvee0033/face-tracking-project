import {
    Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('conversations')
export class Conversation {
    @PrimaryGeneratedColumn('uuid') id: string;
    @Column() recruiterId: string;
    @ManyToOne(() => User) @JoinColumn({ name: 'recruiterId' }) recruiter: User;
    @Column() candidateId: string;
    @ManyToOne(() => User) @JoinColumn({ name: 'candidateId' }) candidate: User;
    @Column({ nullable: true }) jobId: string;
    @Column({ nullable: true }) lastMessageAt: Date;
    @CreateDateColumn() createdAt: Date;
}

@Entity('messages')
export class Message {
    @PrimaryGeneratedColumn('uuid') id: string;
    @Column() conversationId: string;
    @Column() senderId: string;
    @ManyToOne(() => User) @JoinColumn({ name: 'senderId' }) sender: User;
    @Column({ type: 'text' }) content: string;
    @Column({ nullable: true }) attachmentUrl: string;
    @Column({ default: false }) isRead: boolean;
    @CreateDateColumn() createdAt: Date;
}
