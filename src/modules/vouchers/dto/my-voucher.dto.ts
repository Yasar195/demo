import { VoucherRequestStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "src/common/dto";

export class MyVoucherDto extends PaginationDto {
    @IsOptional()
    @IsEnum(VoucherRequestStatus)
    status?: VoucherRequestStatus
}