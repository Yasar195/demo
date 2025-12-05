import { IsUUID, IsEnum, IsInt, Min, Max, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReviewCategory } from '@prisma/client';

export class CreateReviewDto {
    @IsUUID()
    locationId: string;

    @IsEnum(ReviewCategory)
    category: ReviewCategory;

    @IsInt()
    @Min(1)
    @Max(5)
    rating: number;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    comment?: string;
}
