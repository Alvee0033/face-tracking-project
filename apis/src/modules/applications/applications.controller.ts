import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ApplicationsService } from './applications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ApplicationStatus } from './application.entity';

class ApplyDto {
    @ApiProperty() @IsString() jobId: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() coverLetter?: string;
    @ApiProperty({ required: false }) @IsOptional() @IsString() resumeUrl?: string;
}

class UpdateStatusDto {
    @ApiProperty({ enum: ApplicationStatus }) @IsEnum(ApplicationStatus) status: ApplicationStatus;
    @ApiProperty({ required: false }) @IsOptional() @IsString() notes?: string;
}

@ApiTags('applications')
@UseGuards(JwtAuthGuard) @ApiBearerAuth('JWT')
@Controller('applications')
export class ApplicationsController {
    constructor(private service: ApplicationsService) { }

    @Post()
    @UseGuards(RolesGuard) @Roles('candidate')
    @ApiOperation({ summary: 'Apply to a job (candidate only)' })
    apply(@Request() req, @Body() dto: ApplyDto) {
        return this.service.apply(req.user.id, dto);
    }

    @Get('candidate')
    @UseGuards(RolesGuard) @Roles('candidate')
    @ApiOperation({ summary: 'Get candidate own applications' })
    async myApplications(@Request() req) {
        const applications = await this.service.findByCandidate(req.user.id);
        return { applications };
    }

    @Get('recruiter')
    @UseGuards(RolesGuard) @Roles('recruiter')
    @ApiOperation({ summary: 'Get all applications for recruiter jobs' })
    recruiterApplications(@Request() req) { return this.service.findByRecruiter(req.user.id); }

    @Get('job/:jobId')
    @UseGuards(RolesGuard) @Roles('recruiter')
    @ApiOperation({ summary: 'Get applications for a specific job' })
    byJob(@Request() req, @Param('jobId') jobId: string) {
        return this.service.findByJob(jobId, req.user.id);
    }

    @Patch(':id/status')
    @UseGuards(RolesGuard) @Roles('recruiter')
    @ApiOperation({ summary: 'Update application status (recruiter only)' })
    updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
        return this.service.updateStatus(id, dto.status, dto.notes);
    }
}
