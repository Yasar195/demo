import { IsString, IsNumber, IsBoolean, IsOptional, IsObject, Min } from 'class-validator';

export class UpdatePlanDto {
    @IsOptional()
    @IsString()
    displayName?: string;

    @IsOptional()
    @IsString()
    description?: string;

    // Pricing
    @IsOptional()
    @IsNumber()
    @Min(0)
    price?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    yearlyPrice?: number;

    // Feature Limits
    @IsOptional()
    @IsNumber()
    maxVouchers?: number;

    @IsOptional()
    @IsNumber()
    maxLocations?: number;

    @IsOptional()
    @IsNumber()
    maxActiveVouchers?: number;

    // Features
    @IsOptional()
    @IsBoolean()
    analyticsAccess?: boolean;

    @IsOptional()
    @IsBoolean()
    prioritySupport?: boolean;

    @IsOptional()
    @IsBoolean()
    customBranding?: boolean;

    @IsOptional()
    @IsBoolean()
    apiAccess?: boolean;

    @IsOptional()
    @IsBoolean()
    bulkVoucherUpload?: boolean;

    @IsOptional()
    @IsBoolean()
    advancedReporting?: boolean;

    @IsOptional()
    @IsBoolean()
    multiLocationSupport?: boolean;

    // Status
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsBoolean()
    isVisible?: boolean;

    // Metadata
    @IsOptional()
    @IsNumber()
    sortOrder?: number;

    @IsOptional()
    @IsObject()
    features?: any;
}
