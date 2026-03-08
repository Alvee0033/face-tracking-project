import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InterviewsService } from './interviews.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('interviews')
@UseGuards(JwtAuthGuard) @ApiBearerAuth('JWT')
@Controller('interviews')
export class InterviewsController {
  constructor(private service: InterviewsService) {}

  @Post()
  @ApiOperation({ summary: 'Schedule an interview' })
  schedule(@Request() req, @Body() dto: any) {
    return this.service.schedule({ ...dto, recruiterId: req.user.id });
  }

  @Get()
  @ApiOperation({ summary: 'Get user interviews' })
  findAll(@Request() req) { return this.service.findByUser(req.user.id); }

  @Get(':id')
  @ApiOperation({ summary: 'Get interview details' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Patch(':id')
  @ApiOperation({ summary: 'Update interview' })
  update(@Param('id') id: string, @Body() dto: any) { return this.service.update(id, dto); }
}
