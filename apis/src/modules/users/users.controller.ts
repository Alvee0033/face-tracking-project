import { Controller, Get, Param, Query, UseGuards, Patch } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT')
@Controller('users')
export class UsersController {
    constructor(private service: UsersService) { }

    /**
     * Endpoint to list all users. Requires admin role.
     * @param role Optional role to filter users
     * @returns A list of users
     */
    @Get()
    @Roles('admin')
    @ApiOperation({ summary: 'List all users (admin only)' })
    findAll(@Query('role') role?: string): Promise<any> {
        return this.service.findAll(role as any);
    }

    /**
     * Endpoint to retrieve user statistics. Requires admin role.
     * @returns Statistics about users
     */
    @Get('stats')
    @Roles('admin')
    @ApiOperation({ summary: 'User statistics (admin only)' })
    stats(): Promise<{ total: number; candidates: number; recruiters: number }> {
        return this.service.stats();
    }

    /**
     * Endpoint to get a specific user by their ID.
     * @param id The ID of the user
     * @returns The user object
     */
    @Get(':id')
    @ApiOperation({ summary: 'Get user by ID' })
    findOne(@Param('id') id: string): Promise<any> {
        return this.service.findOne(id);
    }

    /**
     * Endpoint to toggle a user's active status. Requires admin role.
     * @param id The ID of the user to toggle
     * @returns The updated user
     */
    @Patch(':id/toggle-active')
    @Roles('admin')
    @ApiOperation({ summary: 'Toggle user active status (admin only)' })
    toggleActive(@Param('id') id: string): Promise<any> {
        return this.service.toggleActive(id);
    }
}
