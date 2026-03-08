import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { SnakeCaseInterceptor } from './common/interceptors/snake-case.interceptor';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

    // Global interceptors
    app.useGlobalInterceptors(new SnakeCaseInterceptor());

    // Global prefix
    app.setGlobalPrefix('api/v1');

    // CORS
    app.enableCors({
        origin: [
            configService.get('FRONTEND_URL') || 'http://localhost:3000',
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:3002',
            'http://localhost:3003',
        ],
        credentials: true,
    });

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            forbidNonWhitelisted: false,
        }),
    );

    // Swagger setup
    const config = new DocumentBuilder()
        .setTitle('SkillSync API')
        .setDescription(
            '🚀 Full-featured AI-powered Job Portal API.\n\n' +
            '## Features\n' +
            '- 🔐 JWT Authentication\n' +
            '- 👤 Candidate & Recruiter Profiles\n' +
            '- 💼 Job Listings & Applications\n' +
            '- 🤖 AI-Powered Interview & Analysis\n' +
            '- 💬 Real-time Messaging\n' +
            '- 📹 Video Calls (Agora)\n' +
            '- 📚 Course Recommendations\n' +
            '- 🎯 Skill Verification\n',
        )
        .setVersion('1.0')
        .addBearerAuth(
            { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
            'JWT',
        )
        .addTag('auth', 'Authentication & Authorization')
        .addTag('users', 'User Management')
        .addTag('profiles', 'Candidate & Recruiter Profiles')
        .addTag('jobs', 'Job Listings')
        .addTag('applications', 'Job Applications')
        .addTag('ai', 'AI Analysis & Interviews')
        .addTag('messaging', 'Messaging System')
        .addTag('interviews', 'Interview Scheduling')
        .addTag('video-calls', 'Video Calls (Agora)')
        .addTag('courses', 'Course Recommendations')
        .addTag('cv', 'CV Upload & Parsing')
        .addTag('saved-jobs', 'Saved Jobs')
        .addTag('community', 'Community Posts')
        .addTag('admin', 'Admin Panel')
        .addTag('upload', 'File Upload')
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
        customSiteTitle: 'SkillSync Job Portal API Docs',
        swaggerOptions: {
            persistAuthorization: true,
        },
        customCss: `
      .swagger-ui .topbar { background: linear-gradient(135deg, #1e1b4b, #312e81); }
      .swagger-ui .topbar-wrapper img { display: none; }
      .swagger-ui .topbar-wrapper::before { content: '🚀 SkillSync Job Portal API'; color: white; font-size: 1.2rem; font-weight: 700; }
    `,
    });

    const port = configService.get('PORT') || 3001;
    await app.listen(port);
    console.log(`\n🚀 API running at: http://localhost:${port}/api/v1`);
    console.log(`📚 Swagger Docs:  http://localhost:${port}/api/docs\n`);
}
bootstrap();
