import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { BaseResponseDto } from '../../common/dto/base-response.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../iam/auth/guards/jwt-auth.guard';
import { UserRole } from '@prisma/client';
import { DashboardStatsDto, DetailedDashboardStatsDto } from './dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    /**
     * Get basic dashboard statistics
     * @route GET /admin/dashboard
     * @access Admin only
     */
    @Get('dashboard')
    @Roles(UserRole.ADMIN)
    async getDashboardStats(): Promise<BaseResponseDto<DashboardStatsDto>> {
        const stats = await this.adminService.getDashboardStats();
        return BaseResponseDto.success(stats, 'Dashboard statistics retrieved successfully');
    }

    /**
     * Get detailed dashboard statistics with breakdowns
     * @route GET /admin/dashboard/detailed
     * @access Admin only
     */
    @Get('dashboard/detailed')
    @Roles(UserRole.ADMIN)
    async getDetailedDashboardStats(): Promise<BaseResponseDto<DetailedDashboardStatsDto>> {
        const stats = await this.adminService.getDetailedDashboardStats();
        return BaseResponseDto.success(stats, 'Detailed dashboard statistics retrieved successfully');
    }
}
