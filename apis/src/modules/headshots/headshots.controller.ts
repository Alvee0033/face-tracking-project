import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('headshots')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
@Controller('headshots')
export class HeadshotsController {
    /**
     * Endpoint to generate a professional headshot.
     * @param dto Object containing base64 image data
     * @returns A status message
     */
    @Post('generate')
    @ApiOperation({ summary: 'Generate professional headshot (requires remove.bg API key)' })
    generate(@Body() dto: { imageBase64: string }): { message: string; configured: boolean } {
        return {
            message: 'Headshot generation requires remove.bg API key',
            configured: !!process.env.REMOVE_BG_API_KEY,
        };
    }
}
