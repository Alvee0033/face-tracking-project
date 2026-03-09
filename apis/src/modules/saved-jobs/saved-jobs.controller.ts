import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SavedJobsService } from './saved-jobs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('saved-jobs')
@UseGuards(JwtAuthGuard) @ApiBearerAuth('JWT')
@Controller('saved-jobs')
export class SavedJobsController {
  constructor(private service: SavedJobsService) { }

  /**
   * Endpoint to retrieve a user's saved jobs.
   * @param req The request object
   * @returns List of saved jobs
   */
  @Get('saved')
  @ApiOperation({ summary: 'Get saved jobs' })
  async findSaved(@Request() req: any): Promise<{ savedJobs: any[] }> {
    const savedJobs = await this.service.findAll(req.user.id, 'saved');
    return { savedJobs };
  }

  /**
   * Endpoint to save a job.
   * @param req The request object
   * @param jobId The job's ID
   * @returns The created saved job record
   */
  @Post('saved/:jobId')
  @ApiOperation({ summary: 'Save a job' })
  save(@Request() req: any, @Param('jobId') jobId: string): Promise<any> {
    return this.service.save(req.user.id, jobId, 'saved');
  }

  /**
   * Endpoint to remove a saved job.
   * @param req The request object
   * @param jobId The job's ID
   * @returns Success message
   */
  @Delete('saved/:jobId')
  @ApiOperation({ summary: 'Remove a saved job' })
  remove(@Request() req: any, @Param('jobId') jobId: string): Promise<{ message: string }> {
    return this.service.remove(req.user.id, jobId, 'saved');
  }

  /**
   * Endpoint to retrieve jobs a user is interested in.
   * @param req The request object
   * @returns List of interested jobs
   */
  @Get('interested')
  @ApiOperation({ summary: 'Get interested jobs' })
  async findInterested(@Request() req: any): Promise<{ interestedJobs: any[] }> {
    const interestedJobs = await this.service.findAll(req.user.id, 'interested');
    return { interestedJobs };
  }

  /**
   * Endpoint to add a job to the interested list.
   * @param req The request object
   * @param jobId The job's ID
   * @returns The created interested job record
   */
  @Post('interested/:jobId')
  @ApiOperation({ summary: 'Add to interested list' })
  addInterested(@Request() req: any, @Param('jobId') jobId: string): Promise<any> {
    return this.service.save(req.user.id, jobId, 'interested');
  }

  /**
   * Endpoint to remove a job from the interested list.
   * @param req The request object
   * @param jobId The job's ID
   * @returns Success message
   */
  @Delete('interested/:jobId')
  @ApiOperation({ summary: 'Remove from interested list' })
  removeInterested(@Request() req: any, @Param('jobId') jobId: string): Promise<{ message: string }> {
    return this.service.remove(req.user.id, jobId, 'interested');
  }

  /**
   * Endpoint to check if a user has saved or is interested in a job.
   * @param req The request object
   * @param jobId The job's ID
   * @returns The saved/interested status
   */
  @Get('check/:jobId')
  @ApiOperation({ summary: 'Check job saved/interested status' })
  checkStatus(@Request() req: any, @Param('jobId') jobId: string): Promise<{ isSaved: boolean; isInterested: boolean }> {
    return this.service.checkStatus(req.user.id, jobId);
  }

  /**
   * Endpoint to get a learning roadmap based on interested jobs.
   * @param req The request object
   * @returns The generated learning roadmap
   */
  @Get('roadmap')
  @ApiOperation({ summary: 'Get AI learning roadmap' })
  async getRoadmap(@Request() req: any): Promise<{ roadmap: any }> {
    const roadmap = await this.service.getLearningRoadmap(req.user.id);
    return { roadmap };
  }
}
