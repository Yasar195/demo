import { Inject, Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PAYMENT_ADAPTER } from '../../integrations/payments/payment.constants';
import { PaymentAdapter, PaymentIntentResult } from '../../integrations/payments/interfaces/payment-adapter.interface';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { PaymentsRepository } from './repositories/payments.repository';

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);

    constructor(
        @Inject(PAYMENT_ADAPTER) private readonly paymentAdapter: PaymentAdapter,
        private readonly paymentsRepository: PaymentsRepository,
    ) { }

    async getPaymentIntentStatus(paymentIntentId: string): Promise<{ completed: boolean; status: string; raw: unknown }> {
        try {
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

            const completed = intent.status === 'succeeded';
            return { completed, status: intent.status, raw: intent.raw };
        } catch (error) {
            this.handleError('getPaymentIntentStatus', error);
        }
    }

    async createPaymentIntent(dto: CreatePaymentIntentDto, userId: string): Promise<PaymentIntentResult> {
        try {
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
                purpose: dto.purpose as any,
                transactionId: paymentIntent.id,
                paymentGateway: 'STRIPE',
                paymentMethod: dto.paymentMethod as any,
                metadata: dto.metadata as any,
                ...(dto.purpose === 'VOUCHER' ? { voucherId: dto.targetId } : {}),
            });

            return paymentIntent;
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

            // Sync status with database
            if (result.status === 'canceled') {
                await this.paymentsRepository.updateStatusByTransactionId(paymentIntentId, 'CANCELLED');
            }

            return result;
        } catch (error) {
            this.handleError('cancelPaymentIntent', error);
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
