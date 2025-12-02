import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { OrdersRepository } from './repositories';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Order } from './entities';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaService } from '../../database/prisma.service';
import { S3Service } from '../../integrations/s3/s3.service';
import { SseService } from '../sse/sse.service';
import * as QRCode from 'qrcode';

@Injectable()
export class OrdersService {
    constructor(
        private readonly ordersRepository: OrdersRepository,
        private readonly prisma: PrismaService,
        private readonly s3Service: S3Service,
        private readonly sseService: SseService,
    ) { }

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

        return await this.ordersRepository.findWithPagination(
            page,
            limit,
            { userId },
            orderBy,
            {
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
        );
    }

    /**
     * Get a specific order by ID
     */
    async getUserOrderById(userId: string, orderId: string): Promise<Order> {
        const order = await this.ordersRepository.findOneByCondition(
            { id: orderId, userId },
            {
                voucher: {
                    include: {
                        store: true
                    }
                },
                payment: true
            }
        );

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        return order;
    }

    /**
     * Create a new order (buy voucher)
     */
    async createOrder(userId: string, dto: CreateOrderDto): Promise<Order> {
        // 1. Verify payment
        const payment = await this.prisma.payment.findFirst({
            where: { id: dto.paymentId, userId },
        });

        if (!payment) {
            throw new NotFoundException('Payment not found');
        }

        if (payment.status !== 'COMPLETED') {
            throw new BadRequestException('Payment is not completed');
        }

        // Check if payment is already used
        const existingOrder = await this.ordersRepository.findOneByCondition({ paymentId: dto.paymentId });
        if (existingOrder) {
            throw new BadRequestException('Payment already used for an order');
        }

        // 2. Verify voucher
        const voucher = await this.prisma.voucher.findUnique({
            where: { id: dto.voucherId },
        });

        if (!voucher) {
            throw new NotFoundException('Voucher not found');
        }

        if (!voucher.isActive) {
            throw new BadRequestException('Voucher is not active');
        }

        if (voucher.expiresAt < new Date()) {
            throw new BadRequestException('Voucher has expired');
        }

        // Optional: Verify payment amount matches voucher price
        // if (payment.amount !== voucher.sellingPrice) {
        //     throw new BadRequestException('Payment amount does not match voucher price');
        // }

        // 3. Generate instance code logic moved to repository for bulk creation

        // 4. Execute purchase transaction
        try {
            const order = await this.ordersRepository.createOrder(
                userId,
                dto.voucherId,
                dto.paymentId,
                dto.quantity,
                {
                    price: voucher.sellingPrice,
                    faceValue: voucher.faceValue,
                    discount: voucher.discount,
                    expiresAt: voucher.expiresAt,
                }
            );

            // 5. Generate and upload QR code (Async, don't block response if possible, but here we await to return full object)
            // Or we can fire and forget, but then the returned object won't have the URL.
            // Let's await it for better UX.
            try {
                const qrCodeUrl = await this.generateAndUploadQR(order, userId);
                await this.ordersRepository.updateOrderQrCode(order.id, qrCodeUrl);
                order.qrCodeUrl = qrCodeUrl;
            } catch (qrError) {
                // Log error but don't fail the order
                console.error('Failed to generate/upload QR code:', qrError);
            }

            return order;
        } catch (error) {
            if (error.message === 'OUT_OF_STOCK') {
                throw new BadRequestException('Voucher is out of stock');
            }
            throw error;
        }
    }

    /**
     * Redeem a voucher using its instance code
     */
    async redeemVoucher(userId: string, instanceCode: string, quantityToRedeem: number = 1): Promise<Order> {
        // Find the voucher by instance code
        const order = await this.ordersRepository.findByInstanceCode(instanceCode);

        if (!order) {
            throw new NotFoundException('Voucher not found');
        }

        // Verify ownership
        if (order.userId !== userId) {
            throw new BadRequestException('This voucher does not belong to you');
        }

        // Check if voucher is expired
        if (order.expiresAt < new Date()) {
            throw new BadRequestException('This voucher has expired');
        }

        // Check if voucher is already fully used
        if (order.status === 'USED') {
            throw new BadRequestException('This voucher has already been fully redeemed');
        }

        // Check if there's enough quantity available to redeem
        const availableQuantity = order.quantity - order.quantityUsed;
        if (quantityToRedeem > availableQuantity) {
            throw new BadRequestException(
                `Cannot redeem ${quantityToRedeem} voucher(s). Only ${availableQuantity} available.`
            );
        }

        // Perform the redemption
        const updatedOrder = await this.ordersRepository.redeemVoucher(order.id, quantityToRedeem);

        // Send SSE events
        this.sendRedemptionEvents(updatedOrder, userId, order.userId);

        return updatedOrder;
    }

    /**
     * Send SSE events for voucher redemption
     */
    private sendRedemptionEvents(order: Order, scannerId: string, buyerId: string): void {
        const eventData = {
            orderId: order.id,
            instanceCode: order.instanceCode,
            voucherId: order.voucherId,
            voucherName: order.voucher?.name,
            quantity: order.quantity,
            quantityUsed: order.quantityUsed,
            status: order.status,
            redeemedAt: order.redeemedAt,
        };

        // Send to the buyer (voucher owner)
        this.sseService.sendToUser(buyerId, 'voucher_redeemed', {
            ...eventData,
            message: `Your voucher "${order.voucher?.name}" has been redeemed.`,
            role: 'buyer',
        });

        // Send to the scanner (person who redeemed)
        // Only send if scanner is different from buyer
        if (scannerId !== buyerId) {
            this.sseService.sendToUser(scannerId, 'voucher_redemption_confirmed', {
                ...eventData,
                message: `Voucher "${order.voucher?.name}" redeemed successfully.`,
                role: 'scanner',
            });
        }
    }

    /**
     * Generate QR code and upload to S3
     */
    private async generateAndUploadQR(order: Order, userId: string): Promise<string> {
        const qrData = JSON.stringify({
            orderId: order.id,
            instanceCode: order.instanceCode,
            userId,
            voucherId: order.voucherId,
            quantity: order.quantity,
        });

        const qrBuffer = await QRCode.toBuffer(qrData);
        const fileName = `vouchers/qr-codes/${order.instanceCode}.png`;

        // Upload to S3
        const uploadResult = await this.s3Service.upload({
            buffer: qrBuffer,
            key: fileName,
            contentType: 'image/png',
        });

        return uploadResult.url;
    }
}
