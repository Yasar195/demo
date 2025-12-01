import { IsOptional, IsEnum, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export enum VoucherOrderBy {
    NEWEST = 'newest',
    OLDEST = 'oldest',
    LOWEST_QUANTITY = 'lowest_quantity',
    EXPIRING_SOON = 'expiring_soon',
    SELLING_FAST = 'selling_fast',
    HIGHEST_DISCOUNT = 'highest_discount',
    LOWEST_PRICE = 'lowest_price',
}

export class QueryVoucherDto extends PaginationDto {
    @IsOptional()
    @IsEnum(VoucherOrderBy)
    orderBy?: VoucherOrderBy;

    // Additional filters
    @IsOptional()
    @IsString()
    category?: string;

    @IsOptional()
    @IsString()
    storeId?: string;

    @IsOptional()
    @IsBoolean()
    @Type(() => Boolean)
    activeOnly?: boolean;
}
