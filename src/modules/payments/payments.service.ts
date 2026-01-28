import { Inject, Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PAYMENT_ADAPTER } from '../../integrations/payments/payment.constants';
import { PaymentAdapter, PaymentIntentResult } from '../../integrations/payments/interfaces/payment-adapter.interface';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { PaymentsRepository } from './repositories/payments.repository';
import { VouchersRepository } from '../vouchers/repositories/vouchers.repository';
import { RedisService } from '../../integrations/redis/redis.service';
import { PrismaService } from '../../database/prisma.service';
import { BillingPeriod, PaymentPurpose } from '@prisma/client';

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);

    constructor(
        @Inject(PAYMENT_ADAPTER) private readonly paymentAdapter: PaymentAdapter,
        private readonly paymentsRepository: PaymentsRepository,
        private readonly vouchersRepository: VouchersRepository,
        private readonly prisma: PrismaService,
        private readonly redisService: RedisService,
    ) { }

    async getPaymentIntentStatus(paymentIntentId: string): Promise<{ completed: boolean; status: string; raw: unknown }> {
        try {
            // const cacheKey = `payments:status:${paymentIntentId}`;
            // const cachedData = await this.redisService.get(cacheKey);

            // if (cachedData) {
            //     return JSON.parse(cachedData);
            // }

            if (!this.paymentAdapter.getPaymentIntentStatus) {
                throw new Error('Payment status lookup is not supported by the configured payment adapter');
            }

            const intent = await this.paymentAdapter.getPaymentIntentStatus(paymentIntentId);

            // Sync status with database
            let dbStatus = 'PENDING';
            if (intent.status === 'succeeded') dbStatus = 'COMPLETED';
            else if (intent.status === 'processing') dbStatus = 'PROCESSING';
            else if (intent.status === 'canceled') dbStatus = 'CANCELLED';
            else if (intent.status === 'requires_payment_method') dbStatus = 'FAILED';

            await this.paymentsRepository.updateStatusByTransactionId(paymentIntentId, dbStatus as any);

            // Release reservation if payment failed or was cancelled
            if (dbStatus === 'FAILED' || dbStatus === 'CANCELLED') {
                await this.releasePaymentReservation(paymentIntentId);
            }

            const completed = intent.status === 'succeeded';
            const result = { completed, status: intent.status, raw: intent.raw };

            // await this.redisService.set(cacheKey, JSON.stringify(result), 5); // Cache for 5 seconds

            return result;
        } catch (error) {
            this.handleError('getPaymentIntentStatus', error);
        }
    }

    async createPaymentIntent(dto: CreatePaymentIntentDto, userId: string): Promise<PaymentIntentResult> {
        try {
            const RESERVATION_TIMEOUT_MINUTES = 30;

            // For voucher purchases, reserve stock first
            if (dto.purpose === 'VOUCHER') {
                if(!dto.targetId) {
                    throw new HttpException(
                        {
                            message: 'Payment intent creation failed',
                            error: 'Target ID (voucher ID) is required for voucher purchases',
                        },
                        HttpStatus.BAD_REQUEST,
                    );
                }  

                const voucher = await this.vouchersRepository.findById(dto.targetId);
                if (!voucher) {
                    throw new Error('Voucher not found');
                }

                // Get quantity from metadata (default to 1 if not provided)
                const quantity = typeof dto.metadata?.quantity === 'number'
                    ? dto.metadata.quantity
                    : parseInt(dto.metadata?.quantity as string, 10) || 1;

                // Atomically reserve stock
                const reserved = await this.vouchersRepository.reserveStock(dto.targetId, quantity);

                if (!reserved) {
                    throw new HttpException(
                        {
                            message: 'Payment intent creation failed',
                            error: 'Voucher is out of stock or insufficient quantity available',
                        },
                        HttpStatus.BAD_REQUEST,
                    );
                }

                // If reservation succeeded, create payment intent
                try {
                    const paymentIntent = await this.paymentAdapter.createPaymentIntent({
                        amount: dto.amount,
                        currency: dto.currency,
                        description: dto.description,
                        metadata: { ...dto.metadata, purpose: dto.purpose, targetId: dto.targetId, quantity: quantity.toString() },
                    });

                    // Calculate reservation expiry
                    const reservationExpiresAt = new Date();
                    reservationExpiresAt.setMinutes(reservationExpiresAt.getMinutes() + RESERVATION_TIMEOUT_MINUTES);

                    const payment = await this.paymentsRepository.create({
                        userId,
                        amount: dto.amount,
                        currency: dto.currency,
                        status: 'PENDING',
                        purpose: dto.purpose,
                        transactionId: paymentIntent.id,
                        paymentGateway: 'STRIPE',
                        // paymentMethod: dto.paymentMethod as any,
                        metadata: dto.metadata as any,
                        voucherId: dto.targetId,
                        quantityReserved: quantity,
                        reservationExpiresAt,
                    } as any);

                    (paymentIntent as any).paymentId = payment.id;

                    return paymentIntent;
                } catch (error) {
                    // If payment intent creation fails, release the reservation
                    await this.vouchersRepository.releaseReservation(dto.targetId, quantity);
                    throw error;
                }
            } else {
                if (dto.purpose === PaymentPurpose.PLAN) {
                    if (!dto.targetId) {
                        throw new HttpException(
                            {
                                message: 'Payment intent creation failed',
                                error: 'Target ID (plan ID) is required for plan purchases',
                            },
                            HttpStatus.BAD_REQUEST,
                        );
                    }

                    const plan = await this.prisma.subscriptionPlan.findUnique({
                        where: { id: dto.targetId },
                    });

                    if (!plan || !plan.isActive) {
                        throw new HttpException(
                            {
                                message: 'Payment intent creation failed',
                                error: 'Plan not found or inactive',
                            },
                            HttpStatus.BAD_REQUEST,
                        );
                    }

                    const billingPeriod = this.resolveBillingPeriod(
                        dto.metadata?.billingPeriod ?? dto.metadata?.billing_period,
                        plan.billingPeriod,
                    );
                    const expectedPrice =
                        billingPeriod === BillingPeriod.YEARLY ? plan.yearlyPrice ?? plan.price : plan.price;
                    const expectedMinor = this.toMinorUnits(expectedPrice);
                    const providedMinor = this.toMinorUnits(dto.amount);

                    if (Number.isNaN(expectedMinor) || Number.isNaN(providedMinor) || expectedMinor !== providedMinor) {
                        throw new HttpException(
                            {
                                message: 'Payment intent creation failed',
                                error: 'Payment amount does not match plan price',
                            },
                            HttpStatus.BAD_REQUEST,
                        );
                    }

                    if (dto.currency?.toUpperCase() !== plan.currency?.toUpperCase()) {
                        throw new HttpException(
                            {
                                message: 'Payment intent creation failed',
                                error: 'Payment currency does not match plan currency',
                            },
                            HttpStatus.BAD_REQUEST,
                        );
                    }
                }

                // Non-voucher payments (no reservation needed)
                const paymentIntent = await this.paymentAdapter.createPaymentIntent({
                    amount: dto.amount,
                    currency: dto.currency,
                    description: dto.description,
                    metadata: { ...dto.metadata, purpose: dto.purpose, targetId: dto.targetId },
                });

                const payment = await this.paymentsRepository.create({
                    userId,
                    amount: dto.amount,
                    currency: dto.currency,
                    status: 'PENDING',
                    purpose: dto.purpose,
                    transactionId: paymentIntent.id,
                    paymentGateway: 'STRIPE',
                    // paymentMethod: dto.paymentMethod as any,
                    metadata: dto.metadata as any,
                } as any);

                (paymentIntent as any).paymentId = payment.id;

                return paymentIntent;
            }
        } catch (error) {
            this.handleError('createPaymentIntent', error);
        }
    }

    async cancelPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResult> {
        try {
            if (!this.paymentAdapter.cancelPaymentIntent) {
                throw new Error('Cancel payment intent is not supported by the configured payment adapter');
            }

            const result = await this.paymentAdapter.cancelPaymentIntent(paymentIntentId);

            // Sync status with database and release reservation
            if (result.status === 'canceled') {
                await this.paymentsRepository.updateStatusByTransactionId(paymentIntentId, 'CANCELLED');
                await this.releasePaymentReservation(paymentIntentId);
            }

            // Invalidate cache
            // await this.redisService.del(`payments:status:${paymentIntentId}`);

            return result;
        } catch (error) {
            this.handleError('cancelPaymentIntent', error);
        }
    }

    /**
     * Release reservation for a payment (by transaction ID)
     */
    private async releasePaymentReservation(transactionId: string): Promise<void> {
        try {
            const payment = await this.paymentsRepository.findByTransactionIdWithVoucher(transactionId);

            if (!payment || !payment.voucherId || !payment.quantityReserved) {
                return; // No reservation to release
            }

            // Release the stock reservation
            await this.vouchersRepository.releaseReservation(payment.voucherId, payment.quantityReserved);

            // Clear reservation fields from payment
            await this.paymentsRepository.clearReservation(payment.id);

            this.logger.log(`Released reservation for payment ${payment.id}, voucher ${payment.voucherId}, quantity ${payment.quantityReserved}`);
        } catch (error) {
            this.logger.error('Failed to release payment reservation', error);
        }
    }

    private handleError(context: string, error: unknown): never {
        this.logger.error(`PaymentsService.${context} failed`, error as Error);

        const baseMessage =
            context === 'cancelPaymentIntent'
                ? 'Payment cancellation failed'
                : context === 'getPaymentIntentStatus'
                    ? 'Payment status retrieval failed'
                    : 'Payment intent creation failed';

        if (error instanceof HttpException) {
            const status = error.getStatus();
            const response = error.getResponse();
            const detail =
                typeof response === 'string'
                    ? response
                    : (response as any).message || (response as any).error || response;

            throw new HttpException(
                {
                    message: baseMessage,
                    error: detail,
                },
                status,
            );
        }

        const detail = error instanceof Error ? error.message : 'Unexpected error';
        throw new HttpException(
            {
                message: baseMessage,
                error: detail,
            },
            HttpStatus.INTERNAL_SERVER_ERROR,
        );
    }

    private resolveBillingPeriod(raw: unknown, fallback: BillingPeriod): BillingPeriod {
        if (!raw) {
            return fallback;
        }

        const normalized = String(raw).toUpperCase();
        if (normalized in BillingPeriod) {
            return BillingPeriod[normalized as keyof typeof BillingPeriod];
        }

        throw new HttpException(
            {
                message: 'Payment intent creation failed',
                error: 'Invalid billing period provided',
            },
            HttpStatus.BAD_REQUEST,
        );
    }

    private toMinorUnits(value: number | string | { toString(): string } | null | undefined): number {
        if (value === null || value === undefined) {
            return 0;
        }

        const numeric = typeof value === 'number' ? value : Number(value.toString());
        return Math.round(numeric * 100);
    }
}
