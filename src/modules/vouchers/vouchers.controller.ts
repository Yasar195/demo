import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { VouchersService } from './vouchers.service';
import {
    CreateVoucherDto,
    UpdateVoucherDto,
    CreateVoucherRequestDto,
    UpdateVoucherRequestDto,
    QueryVoucherRequestDto,
    ApproveVoucherRequestDto,
    RejectVoucherRequestDto
} from './dto';
import { BaseResponseDto } from '../../common/dto/base-response.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from 'src/iam/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { User } from '../users/entities/user.entity';

@Controller('vouchers')
@UseGuards(JwtAuthGuard)
export class VouchersController {
    constructor(private readonly vouchersService: VouchersService) { }

    @Get()
    async findAll(@Query() pagination: PaginationDto) {
        const result = await this.vouchersService.findAllPaginated(pagination);
        return BaseResponseDto.success(result, 'Vouchers retrieved successfully');
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const voucher = await this.vouchersService.findById(id);
        if (!voucher) {
            return BaseResponseDto.error('Voucher not found');
        }
        return BaseResponseDto.success(voucher, 'Voucher retrieved successfully');
    }

    @Post()
    async create(@Body() dto: CreateVoucherDto) {
        const voucher = await this.vouchersService.createVoucher(dto);
        return BaseResponseDto.success(voucher, 'Voucher created successfully');
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateVoucherDto) {
        const voucher = await this.vouchersService.updateVoucher(id, dto);
        return BaseResponseDto.success(voucher, 'Voucher updated successfully');
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        await this.vouchersService.deleteVoucher(id);
        return BaseResponseDto.success(null, 'Voucher deleted successfully');
    }
}

@Controller('voucher-requests')
@UseGuards(JwtAuthGuard)
export class VoucherRequestController {
    constructor(private readonly vouchersService: VouchersService) { }

    /**
     * Create a new voucher request (Store owner)
     */
    @Post()
    async createVoucherRequest(
        @CurrentUser() user: User,
        @Body() dto: CreateVoucherRequestDto,
    ) {
        const request = await this.vouchersService.createVoucherRequest(user.id, dto);
        return BaseResponseDto.success(request, 'Voucher request created successfully');
    }

    /**
     * Get user's voucher requests (Store owner)
     */
    @Get('my-requests')
    async getUserVoucherRequests(
        @CurrentUser() user: User,
        @Query() pagination: PaginationDto,
    ) {
        const requests = await this.vouchersService.getUserVoucherRequests(user.id, pagination);
        return BaseResponseDto.success(requests, 'Voucher requests retrieved successfully');
    }

    /**
     * Get all voucher requests with filters (Admin only)
     */
    @Get('admin/all')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    async getAllVoucherRequests(@Query() query: QueryVoucherRequestDto) {
        const result = await this.vouchersService.getAllVoucherRequests(query);
        return BaseResponseDto.success(result, 'Voucher requests retrieved successfully');
    }

    /**
     * Get a specific voucher request by ID
     */
    @Get(':id')
    async getVoucherRequestById(
        @Param('id') id: string,
        @CurrentUser() user: User,
    ) {
        const isAdmin = user.role === UserRole.ADMIN;
        const request = await this.vouchersService.getVoucherRequestById(id, user.id, isAdmin);
        return BaseResponseDto.success(request, 'Voucher request retrieved successfully');
    }

    /**
     * Update a voucher request (Store owner, only PENDING)
     */
    @Put(':id')
    async updateVoucherRequest(
        @Param('id') id: string,
        @CurrentUser() user: User,
        @Body() dto: UpdateVoucherRequestDto,
    ) {
        const request = await this.vouchersService.updateVoucherRequest(id, user.id, dto);
        return BaseResponseDto.success(request, 'Voucher request updated successfully');
    }

    /**
     * Cancel a voucher request (Store owner, only PENDING)
     */
    @Delete(':id')
    async cancelVoucherRequest(
        @Param('id') id: string,
        @CurrentUser() user: User,
    ) {
        await this.vouchersService.cancelVoucherRequest(id, user.id);
        return BaseResponseDto.success(null, 'Voucher request cancelled successfully');
    }

    /**
     * Approve a voucher request (Admin only)
     */
    @Post(':id/approve')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    async approveVoucherRequest(
        @Param('id') id: string,
        @CurrentUser() user: User,
        @Body() dto: ApproveVoucherRequestDto,
    ) {
        const voucher = await this.vouchersService.approveVoucherRequest(id, user.id, dto);
        return BaseResponseDto.success(voucher, 'Voucher request approved and voucher created successfully');
    }

    /**
     * Reject a voucher request (Admin only)
     */
    @Post(':id/reject')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    async rejectVoucherRequest(
        @Param('id') id: string,
        @CurrentUser() user: User,
        @Body() dto: RejectVoucherRequestDto,
    ) {
        const request = await this.vouchersService.rejectVoucherRequest(id, user.id, dto);
        return BaseResponseDto.success(request, 'Voucher request rejected successfully');
    }
}
