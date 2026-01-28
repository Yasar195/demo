import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export enum OrdersFilter {
    ACTIVE = 'ACTIVE',
    EXPIRED_OR_USED = 'EXPIRED_OR_USED',
}

export class OrdersQueryDto extends PaginationDto {
    @IsOptional()
    @IsEnum(OrdersFilter)
    filter?: OrdersFilter;
}
