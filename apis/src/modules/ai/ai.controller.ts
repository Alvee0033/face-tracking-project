import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class AnalyzeResumeDto {
    @ApiProperty() @IsString() resumeText: string;
    @ApiProperty() @IsString() jobDescription: string;
}

class StartInterviewDto {
    @ApiProperty() @IsString() jobTitle: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() jobDescription?: string;
}

class SubmitAnswerDto {
    @ApiProperty() @IsString() questionId: string;
    @ApiProperty() @IsString() answer: string;
}

@ApiTags('ai')
@UseGuards(JwtAuthGuard) @ApiBearerAuth('JWT')
@Controller('ai')
export class AiController {
    constructor(private service: AiService) { }

    @Post('analyze-resume')
    @ApiOperation({ summary: 'Analyze resume against a job description using Groq AI' })
    analyzeResume(@Body() dto: AnalyzeResumeDto) {
        return this.service.analyzeResume(dto.resumeText, dto.jobDescription);
    }

    @Post('interview/start')
    @ApiOperation({ summary: 'Start an AI-powered mock interview session' })
    startInterview(@Request() req, @Body() dto: StartInterviewDto) {
        return this.service.startAiInterview(req.user.id, dto.jobTitle, dto.jobDescription);
    }

    @Post('interview/:sessionId/answer')
    @ApiOperation({ summary: 'Submit an answer and get AI evaluation' })
    submitAnswer(@Param('sessionId') sessionId: string, @Body() dto: SubmitAnswerDto) {
        return this.service.submitAnswer(sessionId, dto.questionId, dto.answer);
    }

    @Get('interview/my-sessions')
    @ApiOperation({ summary: 'Get user AI interview sessions' })
    mySessions(@Request() req) { return this.service.getUserSessions(req.user.id); }

    @Get('interview/:sessionId')
    @ApiOperation({ summary: 'Get AI interview session details' })
    getSession(@Param('sessionId') id: string) { return this.service.getSession(id); }
    @Post('jobs/:jobId/analyze-match')
    @ApiOperation({ summary: 'Analyze job skill match for candidate' })
    analyzeMatch(@Request() req, @Param('jobId') jobId: string) {
        return this.service.analyzeMatch(req.user.id, jobId);
    }

    @Get('jobs/:jobId/recommendations')
    @ApiOperation({ summary: 'Get skill recommendations for a job' })
    getRecommendations(@Request() req, @Param('jobId') jobId: string) {
        return this.service.getSkillRecommendations(req.user.id, jobId);
    }
}
