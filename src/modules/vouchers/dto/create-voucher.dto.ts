import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, IsInt, Min, Max, IsUrl, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { VoucherCategory } from '@prisma/client';

export class CreateVoucherDto {
    @IsUUID()
    locationId: string;

    @IsString()
    code: string;

    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    faceValue: number;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    sellingPrice: number;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @Max(100)
    discount: number;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    quantityTotal: number;

    @Type(() => Number)
    @IsInt()
    @Min(0)
    quantityAvailable: number;

    @IsString()
    expiresAt: string;

    @IsString()
    @IsOptional()
    redemptionRules?: string;

    @IsEnum(VoucherCategory)
    @IsOptional()
    category?: VoucherCategory;

    @IsString()
    @IsOptional()
    @IsUrl()
    image?: string;

    @IsString()
    @IsOptional()
    highlightColor?: string;

    @IsString()
    @IsOptional()
    status?: string;

    @IsOptional()
    @IsString()
    giftCardId?: string;

    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    isVerified?: boolean = false;

    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    isActive?: boolean = true;
}
