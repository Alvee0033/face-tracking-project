import { Controller, Post, Body, UseGuards, Get, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('video-calls')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
@Controller('video-calls')
export class VideoCallsController {
    @Post('token')
    @ApiOperation({ summary: 'Generate Agora RTC token for video call' })
    generateToken(@Request() req, @Body() dto: { channelName: string }) {
        return {
            channelName: dto.channelName,
            uid: req.user.id,
            token: 'agora-token-placeholder',
            appId: process.env.AGORA_APP_ID,
            note: 'Integrate agora-access-token package for production tokens',
        };
    }

    @Get('health')
    @ApiOperation({ summary: 'Video calls service health check' })
    health() {
        return { status: 'Video calls module OK', agoraConfigured: !!process.env.AGORA_APP_ID };
    }
}
