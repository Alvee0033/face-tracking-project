import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InterviewsService } from './interviews.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('interviews')
@UseGuards(JwtAuthGuard) @ApiBearerAuth('JWT')
@Controller('interviews')
export class InterviewsController {
  constructor(private service: InterviewsService) {}

  /**
   * Endpoint to schedule an interview.
   * @param req The request object containing user details
   * @param dto Interview scheduling details
   * @returns The scheduled interview
   */
  @Post()
  @ApiOperation({ summary: 'Schedule an interview' })
  schedule(@Request() req: any, @Body() dto: any): Promise<any> {
    return this.service.schedule({ ...dto, recruiterId: req.user.id });
  }

  /**
   * Endpoint to get all interviews for the current user.
   * @param req The request object containing user details
   * @returns List of interviews
   */
  @Get()
  @ApiOperation({ summary: 'Get user interviews' })
  findAll(@Request() req: any): Promise<any> {
    return this.service.findByUser(req.user.id);
  }

  /**
   * Endpoint to get detailed information about a specific interview.
   * @param id The interview ID
   * @returns The interview details
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get interview details' })
  findOne(@Param('id') id: string): Promise<any> {
    return this.service.findOne(id);
  }

  /**
   * Endpoint to update an interview.
   * @param id The interview ID
   * @param dto Update details
   * @returns The updated interview
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update interview' })
  update(@Param('id') id: string, @Body() dto: any): Promise<any> {
    return this.service.update(id, dto);
  }
}
