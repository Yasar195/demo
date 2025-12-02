import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsNumber, Min, IsDateString } from 'class-validator';

export class CreateGiftCardDto {
    @IsBoolean()
    isRealCard: boolean;

    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNumber()
    @IsOptional()
    @Min(0)
    value?: number;

    @IsString()
    @IsOptional()
    imageUrl?: string;

    @IsString()
    @IsNotEmpty()
    code: string; // For real cards, admin provides; for default, auto-generated

    @IsDateString()
    @IsNotEmpty()
    expiresAt: string;
}
