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
            // 1. Atomic update to decrement both available and reserved quantities
            // For the voucher purchase flow:
            // - quantityAvailable was not touched during payment intent (only reservedQuantity was incremented)
            // - Now we need to decrement quantityAvailable (actual sale) and decrement reservedQuantity (release reservation)
            const updateResult = await tx.voucher.updateMany({
                where: {
                    id: voucherId,
                    quantityAvailable: { gte: quantity }, // Must have enough stock
                    reservedQuantity: { gte: quantity }, // Must have enough reserved
                    isActive: true,
                    deletedAt: null,
                },
                data: {
                    quantityAvailable: { decrement: quantity },
                    reservedQuantity: { decrement: quantity }, // Release the reservation
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

    /**
     * Update QR code URL for an order
     */
    async updateOrderQrCode(orderId: string, qrCodeUrl: string): Promise<void> {
        await this.model.update({
            where: { id: orderId },
            data: { qrCodeUrl } as any, // Cast to any until schema is regenerated
        });
    }
}
