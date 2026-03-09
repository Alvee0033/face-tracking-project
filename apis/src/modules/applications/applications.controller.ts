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

    /**
     * Endpoint to apply for a job.
     * @param req The request object containing user details
     * @param dto Application details
     * @returns The created application
     */
    @Post()
    @UseGuards(RolesGuard) @Roles('candidate')
    @ApiOperation({ summary: 'Apply to a job (candidate only)' })
    apply(@Request() req: any, @Body() dto: ApplyDto): Promise<any> {
        return this.service.apply(req.user.id, dto);
    }

    /**
     * Endpoint to retrieve a candidate's own applications.
     * @param req The request object containing user details
     * @returns List of the candidate's applications
     */
    @Get('candidate')
    @UseGuards(RolesGuard) @Roles('candidate')
    @ApiOperation({ summary: 'Get candidate own applications' })
    async myApplications(@Request() req: any): Promise<{ applications: any[] }> {
        const applications = await this.service.findByCandidate(req.user.id);
        return { applications };
    }

    /**
     * Endpoint to retrieve all applications for jobs managed by the current recruiter.
     * @param req The request object containing user details
     * @returns List of applications
     */
    @Get('recruiter')
    @UseGuards(RolesGuard) @Roles('recruiter')
    @ApiOperation({ summary: 'Get all applications for recruiter jobs' })
    recruiterApplications(@Request() req: any): Promise<any[]> {
        return this.service.findByRecruiter(req.user.id);
    }

    /**
     * Endpoint to retrieve all applications for a specific job.
     * @param req The request object containing user details
     * @param jobId The job's ID
     * @returns List of applications for the job
     */
    @Get('job/:jobId')
    @UseGuards(RolesGuard) @Roles('recruiter')
    @ApiOperation({ summary: 'Get applications for a specific job' })
    byJob(@Request() req: any, @Param('jobId') jobId: string): Promise<any[]> {
        return this.service.findByJob(jobId, req.user.id);
    }

    /**
     * Endpoint to update the status of an application.
     * @param id The application ID
     * @param dto The status update details
     * @returns The updated application
     */
    @Patch(':id/status')
    @UseGuards(RolesGuard) @Roles('recruiter')
    @ApiOperation({ summary: 'Update application status (recruiter only)' })
    updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto): Promise<any> {
        return this.service.updateStatus(id, dto.status, dto.notes);
    }
}
