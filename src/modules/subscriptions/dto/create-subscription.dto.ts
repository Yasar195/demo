import { IsString, IsEnum, IsOptional } from 'class-validator';
import { BillingPeriod } from '@prisma/client';

export class CreateSubscriptionDto {
    @IsString()
    planId: string;

    @IsEnum(BillingPeriod)
    @IsOptional()
    billingPeriod?: BillingPeriod = BillingPeriod.MONTHLY;
}
