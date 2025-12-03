import { IsString, IsNumber, IsBoolean, IsEnum, IsOptional, IsObject, Min } from 'class-validator';
import { BillingPeriod } from '@prisma/client';

export class CreatePlanDto {
    @IsString()
    name: string; // e.g., "BASIC", "PREMIUM"

    @IsString()
    displayName: string; // e.g., "Basic Plan", "Premium Plan"

    @IsOptional()
    @IsString()
    description?: string;

    // Pricing
    @IsNumber()
    @Min(0)
    price: number; // Monthly price in cents

    @IsOptional()
    @IsNumber()
    @Min(0)
    yearlyPrice?: number; // Yearly price in cents

    @IsString()
    currency: string; // e.g., "INR", "USD"

    // Billing
    @IsEnum(BillingPeriod)
    billingPeriod: BillingPeriod;

    @IsNumber()
    @Min(0)
    trialDays: number; // e.g., 14

    // Feature Limits
    @IsOptional()
    @IsNumber()
    maxVouchers?: number; // null = unlimited

    @IsOptional()
    @IsNumber()
    maxLocations?: number;

    @IsOptional()
    @IsNumber()
    maxActiveVouchers?: number;

    // Features
    @IsBoolean()
    @IsOptional()
    analyticsAccess?: boolean = true;

    @IsBoolean()
    @IsOptional()
    prioritySupport?: boolean = false;

    @IsBoolean()
    @IsOptional()
    customBranding?: boolean = false;

    @IsBoolean()
    @IsOptional()
    apiAccess?: boolean = false;

    @IsBoolean()
    @IsOptional()
    bulkVoucherUpload?: boolean = false;

    @IsBoolean()
    @IsOptional()
    advancedReporting?: boolean = false;

    @IsBoolean()
    @IsOptional()
    multiLocationSupport?: boolean = true;

    // Status
    @IsBoolean()
    @IsOptional()
    isActive?: boolean = true;

    @IsBoolean()
    @IsOptional()
    isVisible?: boolean = true;

    // Metadata
    @IsNumber()
    @IsOptional()
    sortOrder?: number = 0;

    @IsOptional()
    @IsObject()
    features?: any; // Additional custom features as JSON
}
