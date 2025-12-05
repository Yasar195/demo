import { IsString, IsEnum, IsOptional } from 'class-validator';
import { BillingPeriod } from '@prisma/client';

export class CreateSubscriptionDto {
    @IsOptional()
    @IsString()
    planId?: string; // Optional since it's provided via URL param

    @IsEnum(BillingPeriod)
    @IsOptional()
    billingPeriod?: BillingPeriod = BillingPeriod.MONTHLY;

    @IsOptional()
    @IsString()
    paymentId?: string;
}
