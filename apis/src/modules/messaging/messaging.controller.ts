import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MessagingService } from './messaging.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('messaging')
@UseGuards(JwtAuthGuard) @ApiBearerAuth('JWT')
@Controller('messages')
export class MessagingController {
    constructor(private service: MessagingService) { }

    /**
     * Endpoint to get all conversations for the current user.
     * @param req The request object
     * @returns List of conversations
     */
    @Get('conversations')
    @ApiOperation({ summary: 'Get all conversations for the current user' })
    getMyConversations(@Request() req: any): Promise<any[]> {
        return this.service.getMyConversations(req.user.id);
    }

    /**
     * Endpoint to start or retrieve a conversation between a recruiter and candidate.
     * @param dto Object containing the other user ID and role
     * @returns The conversation object (currently a placeholder)
     */
    @Post('conversations')
    @ApiOperation({ summary: 'Start or get a conversation between recruiter and candidate' })
    startConversation(@Body() dto: { otherUserId: string; isRecruiter: boolean; jobId?: string }): any {
        return null; // Placeholder; real logic needs roles
    }

    /**
     * Endpoint to send a message within a conversation.
     * @param req The request object
     * @param cid The conversation ID
     * @param dto Message payload
     * @returns The sent message
     */
    @Post('conversations/:conversationId/messages')
    @ApiOperation({ summary: 'Send a message in a conversation' })
    sendMessage(
        @Request() req: any,
        @Param('conversationId') cid: string,
        @Body() dto: { content: string; attachmentUrl?: string },
    ): Promise<any> {
        return this.service.sendMessage(req.user.id, cid, dto.content, dto.attachmentUrl);
    }

    /**
     * Endpoint to retrieve messages for a specific conversation.
     * @param cid The conversation ID
     * @returns List of messages
     */
    @Get('conversations/:conversationId/messages')
    @ApiOperation({ summary: 'Get messages for a conversation' })
    getMessages(@Param('conversationId') cid: string): Promise<any[]> {
        return this.service.getMessages(cid);
    }

    /**
     * Endpoint to mark all unread messages in a conversation as read.
     * @param req The request object
     * @param cid The conversation ID
     * @returns A success message
     */
    @Post('conversations/:conversationId/read')
    @ApiOperation({ summary: 'Mark messages as read' })
    markRead(@Request() req: any, @Param('conversationId') cid: string): Promise<{ message: string }> {
        return this.service.markRead(cid, req.user.id);
    }
}
