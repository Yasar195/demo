import { IsString, IsNumber, IsOptional, IsDateString, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVoucherRequestDto {
    @IsString()
    @MinLength(3)
    voucherName: string;

    @IsString()
    @IsOptional()
    voucherDescription?: string;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    voucherValue: number;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    voucherPrice: number;

    @IsString()
    @MinLength(3)
    voucherCode: string;

    @IsDateString()
    expiresAt: string;

    @IsString()
    @IsOptional()
    additionalNotes?: string;
}
