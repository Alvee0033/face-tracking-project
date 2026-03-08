import { Module } from '@nestjs/common';
import { HeadshotsController } from './headshots.controller';

@Module({ controllers: [HeadshotsController] })
export class HeadshotsModule { }
