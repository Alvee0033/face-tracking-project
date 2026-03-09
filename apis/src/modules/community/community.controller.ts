import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { CommunityService } from './community.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('community')
@Controller('community')
export class CommunityController {
  constructor(private service: CommunityService) { }

  /**
   * Endpoint to retrieve community posts.
   * @param type Category type
   * @param page Page number
   * @param limit Items per page
   * @returns List of community posts
   */
  @Get('posts')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30000) // 30 seconds
  @ApiOperation({ summary: 'Get community posts' })
  getPosts(
    @Query('type') type: string,
    @Query('page') page: number,
    @Query('limit') limit: number
  ): Promise<{ success: boolean; data: { posts: any[]; total: number } }> {
    return this.service.getPosts(type, page, limit);
  }

  /**
   * Endpoint to create a new community post.
   * @param req Request object
   * @param dto Post details
   * @returns The created post
   */
  @Post('posts')
  @UseGuards(JwtAuthGuard) @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Create a post' })
  createPost(@Request() req: any, @Body() dto: any): Promise<{ success: boolean; data: any }> {
    return this.service.createPost(req.user.id, dto);
  }

  /**
   * Endpoint to retrieve replies for a post.
   * @param id The ID of the post
   * @returns List of replies
   */
  @Get('posts/:postId/replies')
  @ApiOperation({ summary: 'Get replies for a post' })
  getReplies(@Param('postId') id: string): Promise<{ success: boolean; data: any[] }> {
    return this.service.getReplies(id);
  }

  /**
   * Endpoint to add a reply to a post.
   * @param req Request object
   * @param id The post ID
   * @param dto Reply content
   * @returns The newly created reply
   */
  @Post('posts/:postId/replies')
  @UseGuards(JwtAuthGuard) @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Add a reply to a post' })
  addReply(@Request() req: any, @Param('postId') id: string, @Body() dto: { content: string }): Promise<{ success: boolean; data: any }> {
    return this.service.addReply(id, req.user.id, dto.content);
  }
}
