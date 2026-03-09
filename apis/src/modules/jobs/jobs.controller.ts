import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { CreateJobDto, UpdateJobDto } from './dto/job.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
    constructor(private service: JobsService) { }

    /**
     * Endpoint to create a new job listing.
     * @param req The request object containing user details
     * @param dto The job details
     * @returns The newly created job
     */
    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard) @Roles('recruiter') @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Create a job listing (recruiter only)' })
    create(@Request() req: any, @Body() dto: CreateJobDto): Promise<any> {
        return this.service.create(req.user.id, dto);
    }

    /**
     * Endpoint to browse open jobs with search and filter capabilities.
     * @param query Search, filter, and pagination parameters
     * @returns Paginated list of jobs
     */
    @Get()
    @ApiOperation({ summary: 'Browse all open jobs with search and filters' })
    @ApiQuery({ name: 'search', required: false }) @ApiQuery({ name: 'jobType', required: false })
    @ApiQuery({ name: 'country', required: false }) @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @CacheTTL(60) // Cache job listings for 1 minute
    findAll(@Query() query: any): Promise<any> {
        return this.service.findAll(query);
    }

    /**
     * Endpoint to get a recruiter's own job listings.
     * @param req The request object containing user details
     * @returns List of jobs created by the recruiter
     */
    @Get('recruiter/my-jobs')
    @UseGuards(JwtAuthGuard, RolesGuard) @Roles('recruiter') @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Get recruiter own job listings' })
    myJobs(@Request() req: any): Promise<any> {
        return this.service.findByRecruiter(req.user.id);
    }

    /**
     * Endpoint to get detailed information about a specific job.
     * @param id The ID of the job
     * @returns The job object
     */
    @Get(':id')
    @ApiOperation({ summary: 'Get job details by ID' })
    findOne(@Param('id') id: string): Promise<any> {
        return this.service.findOne(id);
    }

    /**
     * Endpoint to update an existing job listing.
     * @param req The request object containing user details
     * @param id The ID of the job to update
     * @param dto The fields to update
     * @returns The updated job
     */
    @Put(':id')
    @UseGuards(JwtAuthGuard, RolesGuard) @Roles('recruiter') @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Update a job listing' })
    update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateJobDto): Promise<any> {
        return this.service.update(id, req.user.id, dto);
    }

    /**
     * Endpoint to delete a job listing.
     * @param req The request object containing user details
     * @param id The ID of the job to delete
     * @returns A success message
     */
    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard) @Roles('recruiter') @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Delete a job listing' })
    remove(@Request() req: any, @Param('id') id: string): Promise<any> {
        return this.service.remove(id, req.user.id);
    }
}
