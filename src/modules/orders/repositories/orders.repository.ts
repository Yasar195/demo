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

    /**
     * Find a purchased voucher by instance code
     */
    async findByInstanceCode(instanceCode: string): Promise<Order | null> {
        return this.model.findUnique({
            where: { instanceCode },
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
     * Redeem a voucher by updating quantity used and status
     */
    async redeemVoucher(orderId: string, quantityToRedeem: number): Promise<Order> {
        return await this.prisma.$transaction(async (tx) => {
            // Get the current order state
            const order = await tx.userPurchasedVoucher.findUnique({
                where: { id: orderId },
            });

            if (!order) {
                throw new Error('Order not found');
            }

            const newQuantityUsed = order.quantityUsed + quantityToRedeem;
            const totalQuantity = order.quantity;

            // Determine new status
            let newStatus = order.status;
            if (newQuantityUsed >= totalQuantity) {
                newStatus = 'USED';
            } else if (newQuantityUsed > 0) {
                newStatus = 'PARTIALLY_USED';
            }

            // Update the order
            const updatedOrder = await tx.userPurchasedVoucher.update({
                where: { id: orderId },
                data: {
                    quantityUsed: newQuantityUsed,
                    status: newStatus as any,
                    redeemedAt: new Date(),
                },
                include: {
                    voucher: {
                        include: {
                            store: true,
                        },
                    },
                    payment: true,
                },
            });

            return updatedOrder as unknown as Order;
        });
    }
}
