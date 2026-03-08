import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MessagingService } from './messaging.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('messaging')
@UseGuards(JwtAuthGuard) @ApiBearerAuth('JWT')
@Controller('messages')
export class MessagingController {
    constructor(private service: MessagingService) { }

    @Get('conversations')
    @ApiOperation({ summary: 'Get all conversations for the current user' })
    getMyConversations(@Request() req) { return this.service.getMyConversations(req.user.id); }

    @Post('conversations')
    @ApiOperation({ summary: 'Start or get a conversation between recruiter and candidate' })
    startConversation(@Body() dto: { otherUserId: string; isRecruiter: boolean; jobId?: string }) {
        return null; // Placeholder; real logic needs roles
    }

    @Post('conversations/:conversationId/messages')
    @ApiOperation({ summary: 'Send a message in a conversation' })
    sendMessage(
        @Request() req,
        @Param('conversationId') cid: string,
        @Body() dto: { content: string; attachmentUrl?: string },
    ) {
        return this.service.sendMessage(req.user.id, cid, dto.content, dto.attachmentUrl);
    }

    @Get('conversations/:conversationId/messages')
    @ApiOperation({ summary: 'Get messages for a conversation' })
    getMessages(@Param('conversationId') cid: string) { return this.service.getMessages(cid); }

    @Post('conversations/:conversationId/read')
    @ApiOperation({ summary: 'Mark messages as read' })
    markRead(@Request() req, @Param('conversationId') cid: string) {
        return this.service.markRead(cid, req.user.id);
    }
}
