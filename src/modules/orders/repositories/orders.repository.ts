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

    /**
     * Create a new order with transaction to handle race conditions
     */
    async createOrder(
        userId: string,
        voucherId: string,
        paymentId: string,
        quantity: number,
        purchaseDetails: {
            price: number;
            faceValue: number;
            discount: number;
            expiresAt: Date;
        }
    ): Promise<Order> {
        return await this.prisma.$transaction(async (tx) => {
            // 1. Atomic update to decrement quantity
            // This prevents race conditions - if quantity is 0 or less than requested, this update will fail
            const updateResult = await tx.voucher.updateMany({
                where: {
                    id: voucherId,
                    quantityAvailable: { gte: quantity }, // Must have enough stock
                    isActive: true,
                    deletedAt: null,
                },
                data: {
                    quantityAvailable: { decrement: quantity },
                },
            });

            if (updateResult.count === 0) {
                throw new Error('OUT_OF_STOCK');
            }

            // 2. Create the purchase record (Single record with quantity)
            const order = await tx.userPurchasedVoucher.create({
                data: {
                    userId,
                    voucherId,
                    paymentId,
                    instanceCode: `VCH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
                    quantity,
                    quantityUsed: 0,
                    purchasePrice: purchaseDetails.price,
                    purchaseFaceValue: purchaseDetails.faceValue,
                    purchaseDiscount: purchaseDetails.discount,
                    expiresAt: purchaseDetails.expiresAt,
                    status: 'UNUSED',
                } as any,
                include: {
                    voucher: {
                        include: {
                            store: true,
                        },
                    },
                    payment: true,
                },
            });

            return order as unknown as Order;
        });
    }
}
