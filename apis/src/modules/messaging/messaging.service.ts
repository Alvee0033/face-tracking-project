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

    async getOrCreateConversation(recruiterId: string, candidateId: string, jobId?: string) {
        let conv = await this.convRepo.findOne({
            where: { recruiterId, candidateId },
        });
        if (!conv) {
            conv = this.convRepo.create({ recruiterId, candidateId, jobId });
            conv = await this.convRepo.save(conv);
        }
        return conv;
    }

    async getMyConversations(userId: string) {
        return this.convRepo.find({
            where: [{ recruiterId: userId }, { candidateId: userId }],
            relations: ['recruiter', 'candidate'],
            order: { lastMessageAt: 'DESC' },
        });
    }

    async getMessages(conversationId: string) {
        return this.msgRepo.find({
            where: { conversationId },
            relations: ['sender'],
            order: { createdAt: 'ASC' },
        });
    }

    async sendMessage(senderId: string, conversationId: string, content: string, attachmentUrl?: string) {
        const msg = this.msgRepo.create({ senderId, conversationId, content, attachmentUrl });
        const saved = await this.msgRepo.save(msg);
        await this.convRepo.update(conversationId, { lastMessageAt: new Date() });
        return saved;
    }

    async markRead(conversationId: string, userId: string) {
        await this.msgRepo.update({ conversationId, isRead: false }, { isRead: true });
        return { message: 'Messages marked as read' };
    }
}
