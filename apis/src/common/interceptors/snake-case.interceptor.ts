import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class SnakeCaseInterceptor implements NestInterceptor {
    // Top-level keys that the frontend expects in camelCase
    private readonly excludedKeys = [
        'profile', 'user', 'candidateProfile', 'jobPreferences', 'recruiterProfile',
        'unverifiedSkills', 'exam', 'questions', 'answers', 'requiresVerification',
        'totalMarks', 'passingMarks', 'skillName', 'skillLevel'
    ];

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(map(data => this.transform(data)));
    }

    private transform(data: any, isTopLevel = true): any {
        if (data === null || data === undefined) return data;
        if (Array.isArray(data)) return data.map(v => this.transform(v, false));
        if (typeof data !== 'object' || data instanceof Date || data instanceof Buffer) return data;

        const newObj: any = {};
        Object.keys(data).forEach(key => {
            // Don't transform if it's a top-level excluded key
            if (isTopLevel && this.excludedKeys.includes(key)) {
                newObj[key] = this.transform(data[key], false);
            } else {
                const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                newObj[snakeKey] = this.transform(data[key], false);
            }
        });
        return newObj;
    }
}
