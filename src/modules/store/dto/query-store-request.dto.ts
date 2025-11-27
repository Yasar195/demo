import { IsOptional, IsEnum, IsString } from 'class-validator';
import { StoreRequestStatus } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryStoreRequestDto extends PaginationDto {
    @IsOptional()
    @IsEnum(StoreRequestStatus)
    status?: StoreRequestStatus;

    @IsOptional()
    @IsString()
    userId?: string;

    @IsOptional()
    @IsString()
    searchTerm?: string;
}
