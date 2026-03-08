import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SavedJobsService } from './saved-jobs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('saved-jobs')
@UseGuards(JwtAuthGuard) @ApiBearerAuth('JWT')
@Controller('saved-jobs')
export class SavedJobsController {
  constructor(private service: SavedJobsService) { }

  @Get('saved')
  @ApiOperation({ summary: 'Get saved jobs' })
  async findSaved(@Request() req) {
    const savedJobs = await this.service.findAll(req.user.id, 'saved');
    return { savedJobs };
  }

  @Post('saved/:jobId')
  @ApiOperation({ summary: 'Save a job' })
  save(@Request() req, @Param('jobId') jobId: string) { return this.service.save(req.user.id, jobId, 'saved'); }

  @Delete('saved/:jobId')
  @ApiOperation({ summary: 'Remove a saved job' })
  remove(@Request() req, @Param('jobId') jobId: string) { return this.service.remove(req.user.id, jobId, 'saved'); }

  @Get('interested')
  @ApiOperation({ summary: 'Get interested jobs' })
  async findInterested(@Request() req) {
    const interestedJobs = await this.service.findAll(req.user.id, 'interested');
    return { interestedJobs };
  }

  @Post('interested/:jobId')
  @ApiOperation({ summary: 'Add to interested list' })
  addInterested(@Request() req, @Param('jobId') jobId: string) { return this.service.save(req.user.id, jobId, 'interested'); }

  @Delete('interested/:jobId')
  @ApiOperation({ summary: 'Remove from interested list' })
  removeInterested(@Request() req, @Param('jobId') jobId: string) { return this.service.remove(req.user.id, jobId, 'interested'); }

  @Get('check/:jobId')
  @ApiOperation({ summary: 'Check job saved/interested status' })
  checkStatus(@Request() req, @Param('jobId') jobId: string) { return this.service.checkStatus(req.user.id, jobId); }

  @Get('roadmap')
  @ApiOperation({ summary: 'Get AI learning roadmap' })
  async getRoadmap(@Request() req) {
    const roadmap = await this.service.getLearningRoadmap(req.user.id);
    return { roadmap };
  }
}
