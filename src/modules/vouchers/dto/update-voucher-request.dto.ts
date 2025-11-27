import { IsString, IsNumber, IsOptional, IsEnum, IsInt, IsDateString, Min, MinLength, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';
import { VoucherCategory } from '@prisma/client';

export class UpdateVoucherRequestDto {
    @IsString()
    @MinLength(3)
    @IsOptional()
    voucherName?: string;

    @IsString()
    @IsOptional()
    voucherDescription?: string;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    voucherFaceValue?: number;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    voucherPrice?: number;

    @IsString()
    @MinLength(3)
    @IsOptional()
    voucherCode?: string;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    quantityTotal?: number;

    @IsDateString()
    @IsOptional()
    expiresAt?: string;

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
    additionalNotes?: string;
}
