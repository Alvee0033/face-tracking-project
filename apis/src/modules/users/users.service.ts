import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { User, UserRole } from './user.entity';

@Injectable()
export class UsersService {
    constructor(@InjectRepository(User) private repo: Repository<User>) { }

    findAll(role?: UserRole) {
        return this.repo.find({ where: role ? { role } : {}, select: ['id', 'email', 'fullName', 'role', 'createdAt', 'isActive'] });
    }

    async findOne(id: string) {
        const user = await this.repo.findOne({ where: { id } });
        if (!user) throw new NotFoundException('User not found');
        const { password, ...rest } = user;
        return rest;
    }

    async stats() {
        const total = await this.repo.count();
        const candidates = await this.repo.count({ where: { role: UserRole.CANDIDATE } });
        const recruiters = await this.repo.count({ where: { role: UserRole.RECRUITER } });
        return { total, candidates, recruiters };
    }

    async toggleActive(id: string) {
        const user = await this.repo.findOne({ where: { id } });
        if (!user) throw new NotFoundException();
        user.isActive = !user.isActive;
        return this.repo.save(user);
    }
}
