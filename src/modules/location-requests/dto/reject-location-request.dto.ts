import { IsString } from 'class-validator';

export class RejectLocationRequestDto {
    @IsString()
    adminComments: string;
}
