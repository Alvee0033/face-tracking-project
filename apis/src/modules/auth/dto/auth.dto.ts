import { IsEmail, IsString, MinLength, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/user.entity';

export class SignupDto {
    @ApiProperty({ example: 'john@example.com' }) @IsEmail() email: string;
    @ApiProperty({ example: 'password123', minLength: 6 }) @IsString() @MinLength(6) password: string;
    @ApiProperty({ example: 'John Doe' }) @IsString() fullName: string;
    @ApiProperty({ enum: UserRole, example: UserRole.CANDIDATE }) @IsEnum(UserRole) role: UserRole;
}

export class LoginDto {
    @ApiProperty({ example: 'john@example.com' }) @IsEmail() email: string;
    @ApiProperty({ example: 'password123' }) @IsString() password: string;
}
