import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, IsInt, IsDateString, Min, Max, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';
import { VoucherCategory } from '@prisma/client';

export class UpdateVoucherDto {
    @IsOptional()
    @IsString()
    code?: string;

    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    faceValue?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    sellingPrice?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @Max(100)
    discount?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    quantityTotal?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    quantityAvailable?: number;

    @IsOptional()
    @IsDateString()
    expiresAt?: string;

    @IsOptional()
    @IsString()
    redemptionRules?: string;

    @IsOptional()
    @IsEnum(VoucherCategory)
    category?: VoucherCategory;

    @IsOptional()
    @IsString()
    @IsUrl()
    image?: string;

    @IsOptional()
    @IsString()
    highlightColor?: string;

    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsString()
    giftCardId?: string;

    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    isVerified?: boolean;

    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    isActive?: boolean;
}
