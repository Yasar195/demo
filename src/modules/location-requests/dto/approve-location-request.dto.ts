import { IsString, IsOptional } from 'class-validator';

export class ApproveLocationRequestDto {
    @IsOptional()
    @IsString()
    adminComments?: string;
}
