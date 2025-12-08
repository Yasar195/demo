import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { LocationRequestsService } from './location-requests.service';
import { CreateLocationRequestDto, QueryLocationRequestDto, ApproveLocationRequestDto, RejectLocationRequestDto } from './dto';
import { User, UserRole } from '@prisma/client';
import { BaseResponseDto } from '../../common/dto/base-response.dto';
import { JwtAuthGuard } from 'src/iam/auth/guards/jwt-auth.guard';
import { CurrentUser, Roles } from 'src/common/decorators';
import { RolesGuard } from 'src/common/guards';

@Controller('location-requests')
@UseGuards(JwtAuthGuard)
export class LocationRequestsController {
    constructor(private readonly locationRequestsService: LocationRequestsService) { }

    /**
     * Create a new location request (Vendor)
     */
    @Post()
    async createLocationRequest(
        @CurrentUser() user: User,
        @Body() dto: CreateLocationRequestDto,
    ) {
        const request = await this.locationRequestsService.createLocationRequest(user.id, dto);
        return BaseResponseDto.success(request, 'Location request created successfully');
    }

    /**
     * Get own location requests (Vendor)
     */
    @Get('my')
    async getMyLocationRequests(
        @CurrentUser() user: User,
        @Query() query: QueryLocationRequestDto,
    ) {
        const result = await this.locationRequestsService.getUserLocationRequests(user.id, query);
        return BaseResponseDto.success(result, 'Location requests retrieved successfully');
    }

    /**
     * Get specific location request
     */
    @Get(':id')
    async getLocationRequest(
        @CurrentUser() user: User,
        @Param('id') id: string,
    ) {
        const isAdmin = user.role === UserRole.ADMIN;
        const request = await this.locationRequestsService.getLocationRequestById(id, user.id, isAdmin);
        return BaseResponseDto.success(request, 'Location request retrieved successfully');
    }

    /**
     * Update pending location request (Vendor)
     */
    @Patch(':id')
    async updateLocationRequest(
        @CurrentUser() user: User,
        @Param('id') id: string,
        @Body() dto: Partial<CreateLocationRequestDto>,
    ) {
        const request = await this.locationRequestsService.updateLocationRequest(id, user.id, dto);
        return BaseResponseDto.success(request, 'Location request updated successfully');
    }

    /**
     * Cancel location request (Vendor)
     */
    @Delete(':id')
    async cancelLocationRequest(
        @CurrentUser() user: User,
        @Param('id') id: string,
    ) {
        const request = await this.locationRequestsService.cancelLocationRequest(id, user.id);
        return BaseResponseDto.success(request, 'Location request cancelled successfully');
    }

    /**
     * Get all location requests (Admin)
     */
    @Get()
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    async getAllLocationRequests(@Query() query: QueryLocationRequestDto) {
        const result = await this.locationRequestsService.getAllLocationRequests(query);
        return BaseResponseDto.success(result, 'Location requests retrieved successfully');
    }

    /**
     * Approve location request (Admin)
     */
    @Post(':id/approve')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    async approveLocationRequest(
        @CurrentUser() user: User,
        @Param('id') id: string,
        @Body() dto: ApproveLocationRequestDto,
    ) {
        const request = await this.locationRequestsService.approveLocationRequest(id, user.id, dto);
        return BaseResponseDto.success(request, 'Location request approved and location created');
    }

    /**
     * Reject location request (Admin)
     */
    @Post(':id/reject')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    async rejectLocationRequest(
        @CurrentUser() user: User,
        @Param('id') id: string,
        @Body() dto: RejectLocationRequestDto,
    ) {
        const request = await this.locationRequestsService.rejectLocationRequest(id, user.id, dto);
        return BaseResponseDto.success(request, 'Location request rejected');
    }
}
