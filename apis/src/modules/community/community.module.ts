import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunityPost, CommunityReply } from './community.entity';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';

@Module({
  imports: [TypeOrmModule.forFeature([CommunityPost, CommunityReply])],
  controllers: [CommunityController],
  providers: [CommunityService],
})
export class CommunityModule {}
