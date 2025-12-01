import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { BaseResponseDto } from '../../common/dto/base-response.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../iam/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

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
        @Query() pagination: PaginationDto
    ) {
        const result = await this.ordersService.getUserOrders(user.id, pagination);
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
}
