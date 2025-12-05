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

export class QueryLocationsDto extends PaginationDto {
    @IsOptional()
    @IsString()
    city?: string;

    @IsOptional()
    @IsString()
    storeId?: string;

    @IsOptional()
    @IsBoolean()
    @Type(() => Boolean)
    activeOnly?: boolean = true;

    @IsOptional()
    @IsEnum(VoucherOrderBy)
    voucherOrderBy?: VoucherOrderBy = VoucherOrderBy.NEWEST;

    @IsOptional()
    @IsBoolean()
    @Type(() => Boolean)
    includeVouchers?: boolean = true;
}
