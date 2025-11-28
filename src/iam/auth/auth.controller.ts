import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { GoogleTokenDto } from './dto/google-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../modules/users/entities/user.entity';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('google/token')
    @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
    async exchangeGoogleToken(@Body() body: GoogleTokenDto) {
        return this.authService.loginWithGoogleIdToken(body.idToken);
    }

    @Post('login')
    @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
    async login(@Body() body: LoginDto) {
        return this.authService.loginWithEmailPassword(body.email, body.password);
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    async getProfile(@CurrentUser() user: User) {
        return this.authService.getProfile(user.id);
    }

    @Post('refresh')
    @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
    async refreshTokens(@Body() body: { refreshToken: string }) {
        return this.authService.refreshTokens(body.refreshToken);
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    async logout(@CurrentUser() user: User) {
        return this.authService.logout(user.id);
    }
}
