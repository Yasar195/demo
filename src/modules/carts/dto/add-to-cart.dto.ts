import { IsString, IsUUID } from 'class-validator';

export class AddToCartDto {
    @IsString()
    @IsUUID()
    voucherId: string;
}
