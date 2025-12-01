import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '../../../database/repositories/prisma.repository';
import { PrismaService } from '../../../database/prisma.service';
import { Order } from '../entities/order.entity';

@Injectable()
export class OrdersRepository extends PrismaRepository<Order> {
    constructor(prisma: PrismaService) {
        super(prisma, 'userPurchasedVoucher');
    }

    /**
     * Find all orders for a specific user with pagination
     */
    async findUserOrdersWithPagination(
        userId: string,
        page: number,
        limit: number,
        orderBy: any = { createdAt: 'desc' }
    ): Promise<{ data: Order[]; total: number; page: number; totalPages: number }> {
        const where = { userId, deletedAt: null };

        // Get total count
        const total = await this.model.count({ where });

        // Fetch paginated data with relations
        const data = await this.model.findMany({
            where,
            orderBy,
            skip: (page - 1) * limit,
            take: limit,
            include: {
                voucher: {
                    include: {
                        store: {
                            select: {
                                id: true,
                                name: true,
                                logo: true,
                            }
                        }
                    }
                },
                payment: {
                    select: {
                        id: true,
                        amount: true,
                        status: true,
                        paymentMethod: true,
                        completedAt: true,
                        transactionId: true,
                    }
                }
            }
        }) as Order[];

        const totalPages = Math.ceil(total / limit);

        return {
            data,
            total,
            page,
            totalPages,
        };
    }

    /**
     * Find a specific order by ID for a user
     */
    async findUserOrderById(userId: string, orderId: string): Promise<Order | null> {
        return this.model.findFirst({
            where: {
                id: orderId,
                userId,
                deletedAt: null
            },
            include: {
                voucher: {
                    include: {
                        store: true
                    }
                },
                payment: true
            }
        }) as Promise<Order | null>;
    }
}
