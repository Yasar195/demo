import { IsString, IsNumber, IsOptional, IsDateString, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

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
    voucherValue?: number;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    voucherPrice?: number;

    @IsString()
    @MinLength(3)
    @IsOptional()
    voucherCode?: string;

    @IsDateString()
    @IsOptional()
    expiresAt?: string;

    @IsString()
    @IsOptional()
    additionalNotes?: string;
}
