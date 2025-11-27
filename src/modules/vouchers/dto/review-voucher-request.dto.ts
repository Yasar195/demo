import { IsString, IsOptional } from 'class-validator';

export class ApproveVoucherRequestDto {
    @IsString()
    @IsOptional()
    adminComments?: string;
}

export class RejectVoucherRequestDto {
    @IsString()
    @IsOptional()
    adminComments?: string;
}
