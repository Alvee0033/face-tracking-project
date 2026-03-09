import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation, Message } from './messaging.entity';

@Injectable()
export class MessagingService {
    constructor(
        @InjectRepository(Conversation) private convRepo: Repository<Conversation>,
        @InjectRepository(Message) private msgRepo: Repository<Message>,
    ) { }

    /**
     * Gets an existing conversation or creates a new one between a recruiter and candidate.
     * @param recruiterId Recruiter ID
     * @param candidateId Candidate ID
     * @param jobId Optional Job ID context
     * @returns The conversation object
     */
    async getOrCreateConversation(recruiterId: string, candidateId: string, jobId?: string): Promise<Conversation> {
        let conv = await this.convRepo.findOne({
            where: { recruiterId, candidateId },
        });
        if (!conv) {
            conv = this.convRepo.create({ recruiterId, candidateId, jobId });
            conv = await this.convRepo.save(conv);
        }
        return conv;
    }

    /**
     * Retrieves all conversations for a specific user.
     * @param userId The User ID
     * @returns List of conversations
     */
    async getMyConversations(userId: string): Promise<Conversation[]> {
        return this.convRepo.find({
            where: [{ recruiterId: userId }, { candidateId: userId }],
            relations: ['recruiter', 'candidate'],
            order: { lastMessageAt: 'DESC' },
        });
    }

    /**
     * Retrieves all messages for a specific conversation.
     * @param conversationId The Conversation ID
     * @returns List of messages
     */
    async getMessages(conversationId: string): Promise<Message[]> {
        return this.msgRepo.find({
            where: { conversationId },
            relations: ['sender'],
            order: { createdAt: 'ASC' },
        });
    }

    /**
     * Sends a new message within a conversation.
     * @param senderId The sender's ID
     * @param conversationId The conversation ID
     * @param content Message content
     * @param attachmentUrl Optional attachment URL
     * @returns The saved message
     */
    async sendMessage(senderId: string, conversationId: string, content: string, attachmentUrl?: string): Promise<Message> {
        const msg = this.msgRepo.create({ senderId, conversationId, content, attachmentUrl });
        const saved = await this.msgRepo.save(msg);
        await this.convRepo.update(conversationId, { lastMessageAt: new Date() });
        return saved;
    }

    /**
     * Marks all unread messages in a conversation as read.
     * @param conversationId The conversation ID
     * @param userId The User ID (currently marks all, could be restricted to recipient)
     * @returns Success message
     */
    async markRead(conversationId: string, userId: string): Promise<{ message: string }> {
        // Optimization: ideally only mark messages as read where senderId != userId
        await this.msgRepo.update({ conversationId, isRead: false }, { isRead: true });
        return { message: 'Messages marked as read' };
    }
}
