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

    @Get()
    @Roles('admin')
    @ApiOperation({ summary: 'List all users (admin only)' })
    findAll(@Query('role') role?: string) {
        return this.service.findAll(role as any);
    }

    @Get('stats')
    @Roles('admin')
    @ApiOperation({ summary: 'User statistics (admin only)' })
    stats() { return this.service.stats(); }

    @Get(':id')
    @ApiOperation({ summary: 'Get user by ID' })
    findOne(@Param('id') id: string) { return this.service.findOne(id); }

    @Patch(':id/toggle-active')
    @Roles('admin')
    @ApiOperation({ summary: 'Toggle user active status (admin only)' })
    toggleActive(@Param('id') id: string) { return this.service.toggleActive(id); }
}
