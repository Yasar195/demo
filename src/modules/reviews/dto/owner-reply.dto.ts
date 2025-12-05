import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class OwnerReplyDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(1000)
    reply: string;
}
