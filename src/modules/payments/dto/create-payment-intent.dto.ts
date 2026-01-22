import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsObject, Min, Matches, MaxLength, IsEnum } from 'class-validator';
import { PaymentPurpose } from '@prisma/client';

export class CreatePaymentIntentDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    amount: number; // smallest currency unit (e.g., cents)

    @IsString()
    @Matches(/^[A-Z]{3}$/)
    currency: string;

    @IsOptional()
    @IsString()
    @MaxLength(200)
    description?: string;

    @IsOptional()
    @IsObject()
    metadata?: Record<string, string>;

    @IsEnum(PaymentPurpose)
    purpose: PaymentPurpose;

    @IsString()
    @IsOptional()
    targetId: string;

    // @IsString()
    // paymentMethod: 'CREDIT_CARD' | 'DEBIT_CARD' | 'UPI' | 'NET_BANKING' | 'WALLET' | 'CASH' | 'OTHER';
}
