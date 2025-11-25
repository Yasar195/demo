import { IsString, IsNumber, IsOptional, IsBoolean, IsUUID, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateVoucherDto {
    @IsOptional()
    @IsString()
    code?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    discount?: number;

    @IsOptional()
    @IsDateString()
    expiresAt?: string;

    @IsOptional()
    @IsUUID()
    giftCardId?: string;

    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    isVerified?: boolean;
}

