import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignupDto, LoginDto } from './dto/auth.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    /**
     * Endpoint to register a new user.
     * @param dto The signup details
     * @returns The registered user and auth token
     */
    @Post('signup')
    @ApiOperation({ summary: 'Register a new user (candidate or recruiter)' })
    @ApiResponse({ status: 201, description: 'User registered successfully' })
    @ApiResponse({ status: 409, description: 'Email already exists' })
    signup(@Body() dto: SignupDto): Promise<{ user: any; token: string }> {
        return this.authService.signup(dto);
    }

    /**
     * Endpoint to authenticate a user.
     * @param dto The login details
     * @returns The authenticated user and auth token
     */
    @Post('login')
    @ApiOperation({ summary: 'Login with email and password' })
    @ApiResponse({ status: 200, description: 'Returns JWT token and user info' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    login(@Body() dto: LoginDto): Promise<{ user: any; token: string }> {
        return this.authService.login(dto);
    }

    /**
     * Endpoint to retrieve the currently authenticated user's profile.
     * @param req The request object containing the user context
     * @returns The authenticated user's profile
     */
    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @ApiOperation({ summary: 'Get current authenticated user' })
    getMe(@Request() req: any): Promise<any> {
        return this.authService.getMe(req.user.id);
    }
}
