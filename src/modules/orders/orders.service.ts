import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { OrdersRepository } from './repositories';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Order } from './entities';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaService } from '../../database/prisma.service';
import { S3Service } from '../../integrations/s3/s3.service';
import * as QRCode from 'qrcode';

@Injectable()
export class OrdersService {
    constructor(
        private readonly ordersRepository: OrdersRepository,
        private readonly prisma: PrismaService,
        private readonly s3Service: S3Service,
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
