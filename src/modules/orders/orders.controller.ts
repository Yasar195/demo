import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { BaseResponseDto } from '../../common/dto/base-response.dto';
import { CreateOrderDto, RedeemVoucherDto, OrdersQueryDto } from './dto';
import { JwtAuthGuard } from '../../iam/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    /**
     * Get all orders for the authenticated user
     * GET /orders
     */
    @Get()
    async getUserOrders(
        @CurrentUser() user: User,
        @Query() query: OrdersQueryDto
    ) {
        const result = await this.ordersService.getUserOrders(user.id, query);
        return BaseResponseDto.success(result, 'Orders retrieved successfully');
    }

    /**
     * Get a specific order by ID
     * GET /orders/:id
     */
    @Get(':id')
    async getOrderById(
        @CurrentUser() user: User,
        @Param('id') orderId: string
    ) {
        const order = await this.ordersService.getUserOrderById(user.id, orderId);
        return BaseResponseDto.success(order, 'Order retrieved successfully');
    }

    /**
     * Buy a voucher (create order)
     * POST /orders/buy
     */
    @Post('buy')
    async buyVoucher(
        @CurrentUser() user: User,
        @Body() dto: CreateOrderDto
    ) {
        const order = await this.ordersService.createOrder(user.id, dto);
        return BaseResponseDto.success(order, 'Voucher purchased successfully');
    }

    /**
     * Redeem a voucher
     * POST /orders/redeem
     */
    @Post('redeem')
    async redeemVoucher(
        @CurrentUser() user: User,
        @Body() dto: RedeemVoucherDto
    ) {
        const order = await this.ordersService.redeemVoucher(
            user.id,
            dto.instanceCode,
            dto.quantity ?? 1
        );
        return BaseResponseDto.success(order, 'Voucher redeemed successfully');
    }
}
