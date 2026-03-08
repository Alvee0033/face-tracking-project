import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('headshots')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
@Controller('headshots')
export class HeadshotsController {
    @Post('generate')
    @ApiOperation({ summary: 'Generate professional headshot (requires remove.bg API key)' })
    generate(@Body() dto: { imageBase64: string }) {
        return {
            message: 'Headshot generation requires remove.bg API key',
            configured: !!process.env.REMOVE_BG_API_KEY,
        };
    }
}
