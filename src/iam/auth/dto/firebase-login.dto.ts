import { IsString, IsNotEmpty } from 'class-validator';

export class FirebaseLoginDto {
    @IsString({ message: 'ID token must be a string' })
    @IsNotEmpty({ message: 'ID token is required' })
    idToken: string;
}
