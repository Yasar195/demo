import { IsString, IsNotEmpty, IsNumber, IsInt, Min, IsOptional } from 'class-validator';

export class AssignPositionGiftCardDto {
    @IsString()
    @IsNotEmpty()
    giftCardId: string;

    @IsInt()
    @Min(1)
    position: number; // e.g., 3 for 3rd buyer
}
