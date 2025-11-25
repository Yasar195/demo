import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PAYMENT_ADAPTER } from './payment.constants';
import { StripePaymentAdapter } from './stripe/stripe-payment.adapter';

@Module({
    imports: [ConfigModule],
    providers: [
        StripePaymentAdapter,
        {
            provide: PAYMENT_ADAPTER,
            useExisting: StripePaymentAdapter,
        },
    ],
    exports: [PAYMENT_ADAPTER],
})
export class PaymentModule { }
