import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('courses')
@UseGuards(JwtAuthGuard) @ApiBearerAuth('JWT')
@Controller('courses')
export class CoursesController {
    constructor(private service: CoursesService) { }

    /**
     * Endpoint to search for courses or tutorials on YouTube.
     * @param q The search query string
     * @returns A list of video results
     */
    @Get('search')
    @ApiOperation({ summary: 'Search YouTube for course/tutorial videos' })
    @ApiQuery({ name: 'q', description: 'Search query (e.g. React, TypeScript)' })
    search(@Query('q') q: string): Promise<any[]> {
        return this.service.searchYouTube(q);
    }

    /**
     * Endpoint to get course recommendations.
     * @param skills A skill or array of skills to base recommendations on
     * @returns A list of recommended video results
     */
    @Get('recommendations')
    @ApiOperation({ summary: 'Get course recommendations based on skills' })
    @ApiQuery({ name: 'skills', type: [String] })
    recommend(@Query('skills') skills: string | string[]): Promise<any[]> {
        const arr = Array.isArray(skills) ? skills : [skills];
        return this.service.getRecommendations(arr);
    }
}
