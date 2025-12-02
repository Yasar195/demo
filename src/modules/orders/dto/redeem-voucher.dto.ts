import { IsString, IsNotEmpty, IsInt, Min, IsOptional } from 'class-validator';

export class RedeemVoucherDto {
    @IsString()
    @IsNotEmpty()
    instanceCode: string;

    @IsInt()
    @Min(1)
    @IsOptional()
    quantity?: number; // Optional: defaults to 1 if not provided
}
