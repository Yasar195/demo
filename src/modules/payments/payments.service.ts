import { Inject, Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PAYMENT_ADAPTER } from '../../integrations/payments/payment.constants';
import { PaymentAdapter, PaymentIntentResult } from '../../integrations/payments/interfaces/payment-adapter.interface';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { PaymentsRepository } from './repositories/payments.repository';
import { VouchersRepository } from '../vouchers/repositories/vouchers.repository';
import { RedisService } from '../../integrations/redis/redis.service';

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);

    constructor(
        @Inject(PAYMENT_ADAPTER) private readonly paymentAdapter: PaymentAdapter,
        private readonly paymentsRepository: PaymentsRepository,
        private readonly vouchersRepository: VouchersRepository,
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
                const voucher = await this.paymentsRepository.findById(dto.targetId);

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

                    await this.paymentsRepository.create({
                        userId,
                        amount: dto.amount,
                        currency: dto.currency,
                        status: 'PENDING',
                        purpose: dto.purpose,
                        transactionId: paymentIntent.id,
                        paymentGateway: 'STRIPE',
                        paymentMethod: dto.paymentMethod as any,
                        metadata: dto.metadata as any,
                        voucherId: dto.targetId,
                        quantityReserved: quantity,
                        reservationExpiresAt,
                    } as any);

                    return paymentIntent;
                } catch (error) {
                    // If payment intent creation fails, release the reservation
                    await this.vouchersRepository.releaseReservation(dto.targetId, quantity);
                    throw error;
                }
            } else {
                // Non-voucher payments (no reservation needed)
                const paymentIntent = await this.paymentAdapter.createPaymentIntent({
                    amount: dto.amount,
                    currency: dto.currency,
                    description: dto.description,
                    metadata: { ...dto.metadata, purpose: dto.purpose, targetId: dto.targetId },
                });

                await this.paymentsRepository.create({
                    userId,
                    amount: dto.amount,
                    currency: dto.currency,
                    status: 'PENDING',
                    purpose: dto.purpose,
                    transactionId: paymentIntent.id,
                    paymentGateway: 'STRIPE',
                    paymentMethod: dto.paymentMethod as any,
                    metadata: dto.metadata as any,
                } as any);

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
}
