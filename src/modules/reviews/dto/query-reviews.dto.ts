import { IsUUID, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ReviewCategory } from '@prisma/client';

export class QueryReviewsDto {
    @IsUUID()
    locationId: string;

    @IsOptional()
    @IsEnum(ReviewCategory)
    category?: ReviewCategory;

    @IsOptional()
    @Type(() => Number)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    limit?: number = 20;
}
