import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class ReviewStoreRequestDto {
    @IsString()
    @IsOptional()
    adminComments?: string;
}

export class ApproveStoreRequestDto extends ReviewStoreRequestDto {}

export class RejectStoreRequestDto {
    @IsString()
    @IsNotEmpty()
    adminComments: string;
}
