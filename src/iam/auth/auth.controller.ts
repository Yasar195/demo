import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleTokenDto } from './dto/google-token.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('google/token')
    async exchangeGoogleToken(@Body() body: GoogleTokenDto) {
        return this.authService.loginWithGoogleIdToken(body.idToken);
    }
}
