import { IsEmail, IsNotEmpty } from 'class-validator';

export class ValidateEmailDto {
    @IsEmail({}, { message: 'Invalid email format' })
    @IsNotEmpty({ message: 'Email is required' })
    email: string;
}
