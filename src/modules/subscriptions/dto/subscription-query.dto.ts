import { IsOptional, IsEnum, IsString } from 'class-validator';
import { SubscriptionStatus } from '@prisma/client';
import { PaginationDto } from '../../../common/dto';

export class SubscriptionQueryDto extends PaginationDto {
    @IsOptional()
    @IsEnum(SubscriptionStatus)
    status?: SubscriptionStatus;

    @IsOptional()
    @IsString()
    storeId?: string;

    @IsOptional()
    @IsString()
    planId?: string;
}
