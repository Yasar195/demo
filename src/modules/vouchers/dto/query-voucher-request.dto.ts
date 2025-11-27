import { IsEnum, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { VoucherRequestStatus } from '@prisma/client';

export class QueryVoucherRequestDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    page?: number = 1;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    limit?: number = 10;

    @IsString()
    @IsOptional()
    sortBy?: string = 'createdAt';

    @IsEnum(['asc', 'desc'])
    @IsOptional()
    sortOrder?: 'asc' | 'desc' = 'desc';

    @IsEnum(VoucherRequestStatus)
    @IsOptional()
    status?: VoucherRequestStatus;

    @IsString()
    @IsOptional()
    storeId?: string;

    @IsString()
    @IsOptional()
    searchTerm?: string;
}
