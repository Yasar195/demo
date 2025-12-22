import { IsOptional, IsEnum, IsString, IsBoolean, IsNumber } from 'class-validator';
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

export enum LocationOrderBy {
    NEWEST = 'newest',
    OLDEST = 'oldest',
    NEAREST = 'nearest',
}

export class QueryLocationsDto extends PaginationDto {
    @IsOptional()
    @IsEnum(LocationOrderBy)
    orderBy?: LocationOrderBy = LocationOrderBy.NEWEST;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    latitude?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    longitude?: number;

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
    includeVouchers?: boolean = false;
}
