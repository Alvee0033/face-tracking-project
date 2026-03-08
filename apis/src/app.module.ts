import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { AiModule } from './modules/ai/ai.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { InterviewsModule } from './modules/interviews/interviews.module';
import { VideoCallsModule } from './modules/video-calls/video-calls.module';
import { CoursesModule } from './modules/courses/courses.module';
import { CvModule } from './modules/cv/cv.module';
import { SavedJobsModule } from './modules/saved-jobs/saved-jobs.module';
import { CommunityModule } from './modules/community/community.module';
import { AdminModule } from './modules/admin/admin.module';
import { UploadModule } from './modules/upload/upload.module';
import { HeadshotsModule } from './modules/headshots/headshots.module';
import { CacheModule, CacheInterceptor } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';

@Module({
    imports: [
        // Config module (global)
        ConfigModule.forRoot({ isGlobal: true }),

        // TypeORM + PostgreSQL
        TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const url = config.get('DATABASE_URL');
                return {
                    type: 'postgres',
                    url: url,
                    host: !url ? config.get('DB_HOST', 'localhost') : undefined,
                    port: !url ? config.get<number>('DB_PORT', 5432) : undefined,
                    username: !url ? config.get('DB_USERNAME', 'postgres') : undefined,
                    password: !url ? config.get('DB_PASSWORD', 'postgres') : undefined,
                    database: !url ? config.get('DB_DATABASE', 'postgres') : undefined,
                    autoLoadEntities: true,
                    synchronize: config.get('NODE_ENV') === 'development',
                    logging: true,
                    ssl: config.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
                    retryAttempts: 0,
                    retryDelay: 0,
                    keepConnectionAlive: true,
                    extra: {
                        max: 10,
                        connectionTimeoutMillis: 5000,
                        prepareThreshold: 0,
                    },
                };
            },
        }),

        // Feature modules
        AuthModule,
        UsersModule,
        ProfilesModule,
        JobsModule,
        ApplicationsModule,
        AiModule,
        MessagingModule,
        InterviewsModule,
        VideoCallsModule,
        CoursesModule,
        CvModule,
        SavedJobsModule,
        CommunityModule,
        AdminModule,
        UploadModule,
        HeadshotsModule,
        // Global caching with Redis (Optional in Production)
        CacheModule.registerAsync({
            isGlobal: true,
            inject: [ConfigService],
            useFactory: async (config: ConfigService) => {
                const host = config.get('REDIS_HOST');
                const ttl = 600;
                if (!host) {
                    return {
                        ttl,
                    };
                }
                return {
                    store: await redisStore({
                        socket: {
                            host,
                            port: config.get<number>('REDIS_PORT', 6379),
                        },
                        password: config.get('REDIS_PASSWORD'),
                        ttl,
                    }),
                    ttl,
                };
            },
        }),
    ],
    providers: [
        {
            provide: APP_INTERCEPTOR,
            useClass: CacheInterceptor,
        },
    ],
})
export class AppModule { }
