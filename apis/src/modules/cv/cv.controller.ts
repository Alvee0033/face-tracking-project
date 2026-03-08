import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CvService } from './cv.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('cv')
@UseGuards(JwtAuthGuard) @ApiBearerAuth('JWT')
@Controller('cv')
export class CvController {
  constructor(private service: CvService) { }

  @Post('parse')
  @ApiOperation({ summary: 'Parse resume text with AI and extract structured data' })
  parseResume(@Body() dto: { text: string }) { return this.service.parseResume(dto.text); }

  @Post('generate-summary')
  @ApiOperation({ summary: 'Generate AI professional summary from profile data' })
  generateSummary(@Body() dto: any) { return this.service.generateSummary(dto); }

  @Post('enhance-bullets')
  @ApiOperation({ summary: 'Enhine resume bullets with AI' })
  enhanceBullets(@Body() dto: { bullets: string[] }) { return this.service.enhanceBullets(dto); }

  @Post('generate-recommendations')
  @ApiOperation({ summary: 'Generate AI career recommendations' })
  generateRecommendations(@Body() dto: { skills: string[]; roles: string[] }) { return this.service.generateRecommendations(dto); }
}
