import { Module } from '@nestjs/common';
import { VideoCallsController } from './video-calls.controller';

@Module({ controllers: [VideoCallsController] })
export class VideoCallsModule { }
