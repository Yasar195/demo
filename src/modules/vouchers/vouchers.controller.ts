import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { VouchersService } from './vouchers.service';
import { CreateVoucherDto, UpdateVoucherDto } from './dto';
import { BaseResponseDto } from '../../common/dto/base-response.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from 'src/iam/auth/guards/jwt-auth.guard';

@Controller('vouchers')
export class VouchersController {
    constructor(private readonly vouchersService: VouchersService) { }

    @Get()
    @UseGuards(JwtAuthGuard)
    async findAll(@Query() pagination: PaginationDto) {
        const vouchers = await this.vouchersService.findAll();
        return BaseResponseDto.success(vouchers, 'Vouchers retrieved successfully');
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    async findOne(@Param('id') id: string) {
        const voucher = await this.vouchersService.findById(id);
        if (!voucher) {
            return BaseResponseDto.error('Voucher not found');
        }
        return BaseResponseDto.success(voucher, 'Voucher retrieved successfully');
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    async create(@Body() dto: CreateVoucherDto) {
        const voucher = await this.vouchersService.createVoucher(dto);
        return BaseResponseDto.success(voucher, 'Voucher created successfully');
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard)
    async update(@Param('id') id: string, @Body() dto: UpdateVoucherDto) {
        const voucher = await this.vouchersService.updateVoucher(id, dto);
        return BaseResponseDto.success(voucher, 'Voucher updated successfully');
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    async remove(@Param('id') id: string) {
        await this.vouchersService.deleteVoucher(id);
        return BaseResponseDto.success(null, 'Voucher deleted successfully');
    }
}
