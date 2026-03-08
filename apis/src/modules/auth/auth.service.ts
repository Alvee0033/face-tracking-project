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

    async signup(dto: SignupDto) {
        const exists = await this.usersRepo.findOne({ where: { email: dto.email } });
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

    async login(dto: LoginDto) {
        const user = await this.usersRepo.findOne({ where: { email: dto.email } });
        if (!user) throw new UnauthorizedException('Invalid credentials');

        const isMatch = await bcrypt.compare(dto.password, user.password);
        if (!isMatch) throw new UnauthorizedException('Invalid credentials');

        const token = this.generateToken(user);
        return { user: this.sanitize(user), token };
    }

    async getMe(userId: string) {
        const user = await this.usersRepo.findOne({ where: { id: userId } });
        return this.sanitize(user);
    }

    private generateToken(user: User) {
        return this.jwtService.sign({ sub: user.id, email: user.email, role: user.role });
    }

    private sanitize(user: User) {
        const { password, ...rest } = user;
        return rest;
    }
}
