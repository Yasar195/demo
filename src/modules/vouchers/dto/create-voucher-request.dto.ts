import { IsString, IsNumber, IsOptional, IsEnum, IsInt, IsDateString, Min, MinLength, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';
import { VoucherCategory } from '@prisma/client';

export class CreateVoucherRequestDto {
    @IsString()
    @MinLength(3)
    voucherName: string;

    @IsString()
    @IsOptional()
    voucherDescription?: string;

    @IsString()
    locationId: string;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    voucherFaceValue: number;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    voucherPrice: number;

    @IsString()
    @MinLength(3)
    voucherCode: string;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    quantityTotal: number;

    @IsDateString()
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
    additionalNotes?: string;
}
