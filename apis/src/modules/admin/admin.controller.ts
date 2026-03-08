import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin') @ApiBearerAuth('JWT')
@Controller('admin')
export class AdminController {
  @Get('health')
  @ApiOperation({ summary: 'Admin health check (admin only)' })
  health() { return { status: 'Admin panel OK', timestamp: new Date() }; }
}
