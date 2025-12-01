import { Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from './repositories';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Order } from './entities';

@Injectable()
export class OrdersService {
    constructor(private readonly ordersRepository: OrdersRepository) { }

    /**
     * Get all orders for a user with pagination
     */
    async getUserOrders(
        userId: string,
        pagination?: PaginationDto
    ): Promise<{ data: Order[]; total: number; page: number; totalPages: number }> {
        const page = pagination?.page ?? 1;
        const limit = pagination?.limit ?? 10;
        const sortBy = pagination?.sortBy ?? 'createdAt';
        const sortOrder: 'asc' | 'desc' = pagination?.sortOrder?.toLowerCase() === 'asc' ? 'asc' : 'desc';

        const orderBy = {
            [sortBy]: sortOrder
        };

        return await this.ordersRepository.findUserOrdersWithPagination(
            userId,
            page,
            limit,
            orderBy
        );
    }

    /**
     * Get a specific order by ID
     */
    async getUserOrderById(userId: string, orderId: string): Promise<Order> {
        const order = await this.ordersRepository.findUserOrderById(userId, orderId);

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        return order;
    }
}
