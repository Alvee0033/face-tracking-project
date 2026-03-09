import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/user.entity';
import { SignupDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User) private usersRepo: Repository<User>,
        private jwtService: JwtService,
    ) { }

    /**
     * Registers a new user.
     * @param dto Signup data transfer object
     * @returns The registered user without password and the generated JWT token
     */
    async signup(dto: SignupDto): Promise<{ user: Partial<User>; token: string }> {
        const exists = await this.usersRepo.exists({ where: { email: dto.email } });
        if (exists) throw new ConflictException('Email already registered');

        const hashedPassword = await bcrypt.hash(dto.password, 12);
        const user = this.usersRepo.create({
            ...dto,
            password: hashedPassword,
        });
        await this.usersRepo.save(user);

        const token = this.generateToken(user);
        return { user: this.sanitize(user), token };
    }

    /**
     * Authenticates a user.
     * @param dto Login data transfer object
     * @returns The authenticated user without password and the generated JWT token
     */
    async login(dto: LoginDto): Promise<{ user: Partial<User>; token: string }> {
        const user = await this.usersRepo.findOne({ where: { email: dto.email } });
        if (!user) throw new UnauthorizedException('Invalid credentials');

        const isMatch = await bcrypt.compare(dto.password, user.password);
        if (!isMatch) throw new UnauthorizedException('Invalid credentials');

        const token = this.generateToken(user);
        return { user: this.sanitize(user), token };
    }

    /**
     * Retrieves the current authenticated user's profile.
     * @param userId The ID of the authenticated user
     * @returns The user's profile without password
     */
    async getMe(userId: string): Promise<Partial<User>> {
        const user = await this.usersRepo.findOne({ where: { id: userId } });
        if (!user) throw new UnauthorizedException('User not found');
        return this.sanitize(user);
    }

    /**
     * Generates a JWT token for the given user.
     * @param user The user object
     * @returns A signed JWT token
     */
    private generateToken(user: User): string {
        return this.jwtService.sign({ sub: user.id, email: user.email, role: user.role });
    }

    /**
     * Removes sensitive information from the user object.
     * @param user The user object
     * @returns The user object without sensitive information
     */
    private sanitize(user: User): Partial<User> {
        const { password, ...rest } = user;
        return rest;
    }
}
