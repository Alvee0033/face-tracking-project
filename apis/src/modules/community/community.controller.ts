import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { CommunityService } from './community.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('community')
@Controller('community')
export class CommunityController {
  constructor(private service: CommunityService) { }

  @Get('posts')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30000) // 30 seconds
  @ApiOperation({ summary: 'Get community posts' })
  getPosts(
    @Query('type') type: string,
    @Query('page') page: number,
    @Query('limit') limit: number
  ) {
    return this.service.getPosts(type, page, limit);
  }

  @Post('posts')
  @UseGuards(JwtAuthGuard) @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Create a post' })
  createPost(@Request() req, @Body() dto: any) { return this.service.createPost(req.user.id, dto); }

  @Get('posts/:postId/replies')
  @ApiOperation({ summary: 'Get replies for a post' })
  getReplies(@Param('postId') id: string) { return this.service.getReplies(id); }

  @Post('posts/:postId/replies')
  @UseGuards(JwtAuthGuard) @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Add a reply to a post' })
  addReply(@Request() req, @Param('postId') id: string, @Body() dto: { content: string }) {
    return this.service.addReply(id, req.user.id, dto.content);
  }
}
