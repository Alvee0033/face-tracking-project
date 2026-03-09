import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CvService } from './cv.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('cv')
@UseGuards(JwtAuthGuard) @ApiBearerAuth('JWT')
@Controller('cv')
export class CvController {
  constructor(private service: CvService) { }

  /**
   * Endpoint to parse a resume using AI.
   * @param dto The raw resume text
   * @returns Parsed structured data
   */
  @Post('parse')
  @ApiOperation({ summary: 'Parse resume text with AI and extract structured data' })
  parseResume(@Body() dto: { text: string }): Promise<any> {
    return this.service.parseResume(dto.text);
  }

  /**
   * Endpoint to generate a professional summary.
   * @param dto Candidate profile data
   * @returns The generated summary
   */
  @Post('generate-summary')
  @ApiOperation({ summary: 'Generate AI professional summary from profile data' })
  generateSummary(@Body() dto: any): Promise<{ summary: string }> {
    return this.service.generateSummary(dto);
  }

  /**
   * Endpoint to enhance resume bullet points.
   * @param dto Array of bullets to enhance
   * @returns Enhanced bullets
   */
  @Post('enhance-bullets')
  @ApiOperation({ summary: 'Enhine resume bullets with AI' })
  enhanceBullets(@Body() dto: { bullets: string[] }): Promise<{ enhancedBullets: string[] }> {
    return this.service.enhanceBullets(dto);
  }

  /**
   * Endpoint to generate career recommendations.
   * @param dto Skills and target roles
   * @returns Career recommendations
   */
  @Post('generate-recommendations')
  @ApiOperation({ summary: 'Generate AI career recommendations' })
  generateRecommendations(@Body() dto: { skills: string[]; roles: string[] }): Promise<{ suggestedSkills: string[]; targetIndustries: string[]; advice: string }> {
    return this.service.generateRecommendations(dto);
  }
}
