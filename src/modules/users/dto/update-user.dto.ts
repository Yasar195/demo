import { IsEmail, IsString, MinLength, IsOptional, IsIn } from 'class-validator';

export class UpdateUserDto {
    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    @MinLength(2)
    name?: string;

    @IsOptional()
    @IsString()
    @MinLength(6)
    password?: string;

    @IsOptional()
    @IsIn(['user', 'admin', 'moderator'])
    role?: string;
}
