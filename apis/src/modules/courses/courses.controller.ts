import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('courses')
@UseGuards(JwtAuthGuard) @ApiBearerAuth('JWT')
@Controller('courses')
export class CoursesController {
    constructor(private service: CoursesService) { }

    @Get('search')
    @ApiOperation({ summary: 'Search YouTube for course/tutorial videos' })
    @ApiQuery({ name: 'q', description: 'Search query (e.g. React, TypeScript)' })
    search(@Query('q') q: string) { return this.service.searchYouTube(q); }

    @Get('recommendations')
    @ApiOperation({ summary: 'Get course recommendations based on skills' })
    @ApiQuery({ name: 'skills', type: [String] })
    recommend(@Query('skills') skills: string | string[]) {
        const arr = Array.isArray(skills) ? skills : [skills];
        return this.service.getRecommendations(arr);
    }
}
