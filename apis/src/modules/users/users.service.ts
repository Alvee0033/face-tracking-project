import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { User, UserRole } from './user.entity';

@Injectable()
export class UsersService {
    constructor(@InjectRepository(User) private repo: Repository<User>) { }

    /**
     * Retrieves all users, optionally filtered by role.
     * @param role The optional user role to filter by
     * @returns A list of users with limited fields
     */
    async findAll(role?: UserRole): Promise<Partial<User>[]> {
        return this.repo.find({ where: role ? { role } : {}, select: ['id', 'email', 'fullName', 'role', 'createdAt', 'isActive'] });
    }

    /**
     * Retrieves a single user by ID.
     * @param id The user ID
     * @returns The user object without password
     */
    async findOne(id: string): Promise<Partial<User>> {
        const user = await this.repo.findOne({ where: { id } });
        if (!user) throw new NotFoundException('User not found');
        const { password, ...rest } = user;
        return rest;
    }

    /**
     * Retrieves user statistics including total count and breakdown by role.
     * @returns Statistics object
     */
    async stats(): Promise<{ total: number; candidates: number; recruiters: number }> {
        const statsQuery = await this.repo.createQueryBuilder('user')
            .select('user.role', 'role')
            .addSelect('COUNT(user.id)', 'count')
            .groupBy('user.role')
            .getRawMany();

        let candidates = 0;
        let recruiters = 0;
        let total = 0;

        statsQuery.forEach(stat => {
            const count = parseInt(stat.count, 10);
            total += count;
            if (stat.role === UserRole.CANDIDATE) candidates = count;
            if (stat.role === UserRole.RECRUITER) recruiters = count;
        });

        return { total, candidates, recruiters };
    }

    /**
     * Toggles the active status of a user.
     * @param id The user ID
     * @returns The updated user
     */
    async toggleActive(id: string): Promise<User> {
        const user = await this.repo.findOne({ where: { id } });
        if (!user) throw new NotFoundException('User not found');
        user.isActive = !user.isActive;
        return this.repo.save(user);
    }
}
