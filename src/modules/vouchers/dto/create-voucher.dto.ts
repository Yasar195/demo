import { IsString, IsNumber, IsOptional, IsBoolean, IsUUID, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVoucherDto {
    @IsString()
    code: string;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    discount: number;

    @IsDateString()
    expiresAt: string;

    @IsOptional()
    @IsUUID()
    giftCardId?: string;

    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    isVerified?: boolean = false;
}

