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

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard) @Roles('recruiter') @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Create a job listing (recruiter only)' })
    create(@Request() req, @Body() dto: CreateJobDto) {
        return this.service.create(req.user.id, dto);
    }

    @Get()
    @ApiOperation({ summary: 'Browse all open jobs with search and filters' })
    @ApiQuery({ name: 'search', required: false }) @ApiQuery({ name: 'jobType', required: false })
    @ApiQuery({ name: 'country', required: false }) @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @CacheTTL(60) // Cache job listings for 1 minute
    findAll(@Query() query: any) {
        return this.service.findAll(query);
    }

    @Get('recruiter/my-jobs')
    @UseGuards(JwtAuthGuard, RolesGuard) @Roles('recruiter') @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Get recruiter own job listings' })
    myJobs(@Request() req) { return this.service.findByRecruiter(req.user.id); }

    @Get(':id')
    @ApiOperation({ summary: 'Get job details by ID' })
    findOne(@Param('id') id: string) { return this.service.findOne(id); }

    @Put(':id')
    @UseGuards(JwtAuthGuard, RolesGuard) @Roles('recruiter') @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Update a job listing' })
    update(@Request() req, @Param('id') id: string, @Body() dto: UpdateJobDto) {
        return this.service.update(id, req.user.id, dto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard) @Roles('recruiter') @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Delete a job listing' })
    remove(@Request() req, @Param('id') id: string) {
        return this.service.remove(id, req.user.id);
    }
}
