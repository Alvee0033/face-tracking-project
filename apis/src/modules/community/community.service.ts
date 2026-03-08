import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommunityPost, CommunityReply } from './community.entity';

@Injectable()
export class CommunityService {
  constructor(
    @InjectRepository(CommunityPost) private postRepo: Repository<CommunityPost>,
    @InjectRepository(CommunityReply) private replyRepo: Repository<CommunityReply>,
  ) { }

  async getPosts(type: string = 'official', page = 1, limit = 20) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const [posts, total] = await this.postRepo.findAndCount({
      where: type ? { category: type } : {},
      relations: ['author'],
      order: { createdAt: 'DESC' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    });
    return {
      success: true,
      data: {
        posts: posts.map(p => ({
          ...p,
          likes: p.likeCount,
          comments: p.replyCount,
          time: p.createdAt,
          type: p.category || 'official',
          image: p.imageUrl
        })),
        total
      }
    };
  }

  async createPost(authorId: string, dto: any) {
    const category = dto.type || 'official';
    const post = this.postRepo.create({ ...dto, authorId, category });
    const saved = await this.postRepo.save(post) as any;
    const data = await this.postRepo.findOne({ where: { id: saved.id }, relations: ['author'] });
    return {
      success: true,
      data: {
        ...data,
        likes: data.likeCount,
        comments: data.replyCount,
        time: data.createdAt,
        type: data.category,
        image: data.imageUrl
      }
    };
  }

  async getReplies(postId: string) {
    const replies = await this.replyRepo.find({ where: { postId }, relations: ['author'], order: { createdAt: 'ASC' } });
    return { success: true, data: replies };
  }

  async addReply(postId: string, authorId: string, content: string) {
    const result = await this.replyRepo.insert({ postId, authorId, content });
    const id = result.identifiers[0]?.id as string;
    await this.postRepo.increment({ id: postId }, 'replyCount', 1);
    const reply = await this.replyRepo.findOne({ where: { id }, relations: ['author'] });
    return { success: true, data: reply };
  }
}
