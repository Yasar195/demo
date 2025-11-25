import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { PaymentAdapter, CreatePaymentIntentInput, PaymentIntentResult } from '../interfaces/payment-adapter.interface';
import { StripeConfig } from '../../../config/interfaces';

@Injectable()
export class StripePaymentAdapter implements PaymentAdapter {
    private client?: Stripe;
    private readonly logger = new Logger(StripePaymentAdapter.name);

    constructor(private readonly configService: ConfigService) {
        const key = this.configService.get<string>('STRIPE_SECRET_KEY');
        const config: StripeConfig = {
            secretKey: key as string,
            apiVersion: '2024-06-20',
            webhookSecret: this.configService.get<string>('STRIPE_WEBHOOK_SECRET'),
        }
        // console.log(config)
        if (!config?.secretKey) {
            this.logger.warn('Stripe secret key not configured. Set STRIPE_SECRET_KEY env variable.');
            return;
        }

        this.client = new Stripe(config.secretKey, {
            apiVersion: (config.apiVersion as Stripe.LatestApiVersion) || '2024-06-20',
        });
    }

    async getPaymentIntentStatus(paymentIntentId: string): Promise<PaymentIntentResult> {
        if (!this.client) {
            throw new Error('Stripe secret key not configured. Set STRIPE_SECRET_KEY env variable.');
        }

        try {
            const intent = await this.client.paymentIntents.retrieve(paymentIntentId);
            this.logger.debug(`Retrieved Stripe payment intent ${intent.id} with status ${intent.status}`);

            return {
                id: intent.id,
                clientSecret: intent.client_secret,
                status: intent.status,
                raw: intent,
            };
        } catch (error: any) {
            this.logger.error('Stripe getPaymentIntentStatus failed', error);
            throw new BadRequestException(error?.message || 'Failed to fetch payment intent status');
        }
    }

    async createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentResult> {
        if (!this.client) {
            throw new Error('Stripe secret key not configured. Set STRIPE_SECRET_KEY env variable.');
        }

        try {
            let { amount, currency, description, metadata } = input;
            amount = amount * 100; // convert to smallest currency unit

            const intent = await this.client.paymentIntents.create({
                amount,
                currency: currency.toLowerCase(),
                description,
                metadata,
                automatic_payment_methods: { enabled: true },
            });

            this.logger.debug(`Created Stripe payment intent ${intent.id}`);

            return {
                id: intent.id,
                clientSecret: intent.client_secret,
                status: intent.status,
                raw: intent,
            };
        } catch (error: any) {
            this.logger.error('Stripe createPaymentIntent failed', error);
            throw new BadRequestException(error?.message || 'Failed to create payment intent');
        }
    }

    async cancelPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResult> {
        if (!this.client) {
            throw new Error('Stripe secret key not configured. Set STRIPE_SECRET_KEY env variable.');
        }

        try {
            const intent = await this.client.paymentIntents.cancel(paymentIntentId);

            this.logger.debug(`Cancelled Stripe payment intent ${intent.id}`);

            return {
                id: intent.id,
                clientSecret: intent.client_secret,
                status: intent.status,
                raw: intent,
            };
        } catch (error: any) {
            this.logger.error('Stripe cancelPaymentIntent failed', error);
            throw new BadRequestException(error?.message || 'Failed to cancel payment intent');
        }
    }
}
