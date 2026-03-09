import { Controller, Post, Body, UseGuards, Get, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('video-calls')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
@Controller('video-calls')
export class VideoCallsController {
    /**
     * Endpoint to generate an Agora RTC token for a video call.
     * @param req The request object
     * @param dto The channel name
     * @returns Token generation data
     */
    @Post('token')
    @ApiOperation({ summary: 'Generate Agora RTC token for video call' })
    generateToken(@Request() req: any, @Body() dto: { channelName: string }): { channelName: string; uid: string; token: string; appId?: string; note: string } {
        return {
            channelName: dto.channelName,
            uid: req.user.id,
            token: 'agora-token-placeholder',
            appId: process.env.AGORA_APP_ID,
            note: 'Integrate agora-access-token package for production tokens',
        };
    }

    /**
     * Endpoint for video call service health check.
     * @returns Health status object
     */
    @Get('health')
    @ApiOperation({ summary: 'Video calls service health check' })
    health(): { status: string; agoraConfigured: boolean } {
        return { status: 'Video calls module OK', agoraConfigured: !!process.env.AGORA_APP_ID };
    }
}
