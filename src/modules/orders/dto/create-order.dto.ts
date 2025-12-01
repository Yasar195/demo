import { IsString, IsUUID, IsInt, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderDto {
    @IsString()
    @IsUUID()
    paymentId: string;

    @IsString()
    @IsUUID()
    voucherId: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    quantity: number = 1;
}
