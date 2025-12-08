import { IsOptional, IsEnum, IsString } from 'class-validator';
import { LocationRequestStatus } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryLocationRequestDto extends PaginationDto {
    @IsOptional()
    @IsEnum(LocationRequestStatus)
    status?: LocationRequestStatus;

    @IsOptional()
    @IsString()
    storeId?: string;

    @IsOptional()
    @IsString()
    city?: string;
}
