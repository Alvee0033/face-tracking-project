import {
    Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

export enum UserRole {
    CANDIDATE = 'candidate',
    RECRUITER = 'recruiter',
    ADMIN = 'admin',
}

@Entity('users')
export class User {
    @ApiProperty() @PrimaryGeneratedColumn('uuid') id: string;
    @ApiProperty() @Column({ unique: true }) email: string;
    @Exclude() @Column() password: string;
    @ApiProperty() @Column() fullName: string;
    @ApiProperty({ enum: UserRole }) @Column({ type: 'enum', enum: UserRole, default: UserRole.CANDIDATE }) role: UserRole;
    @ApiProperty() @Column({ nullable: true }) phoneNumber: string;
    @ApiProperty() @Column({ nullable: true }) profilePictureUrl: string;
    @ApiProperty() @Column({ default: true }) isActive: boolean;
    @ApiProperty() @Column({ default: true }) isEmailVerified: boolean;
    @ApiProperty() @CreateDateColumn() createdAt: Date;
    @ApiProperty() @UpdateDateColumn() updatedAt: Date;
}
