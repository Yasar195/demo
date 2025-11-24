import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { StringValue } from 'ms';
import { UsersService } from '../../modules/users/users.service';
import { User } from '../../modules/users/entities/user.entity';

@Injectable()
export class AuthService {
    private readonly googleClient: OAuth2Client;

    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {
        this.googleClient = new OAuth2Client(this.configService.get<string>('google.clientId'));
    }

    async loginWithGoogleIdToken(idToken: string): Promise<{ user: User; tokens: { accessToken: string; refreshToken: string } }> {
        const payload = await this.verifyGoogleIdToken(idToken);
        const normalized = {
            providerId: payload.sub,
            email: payload.email,
            name: payload.name || payload.given_name || payload.email,
            avatarUrl: payload.picture,
        };

        return this.createGoogleUserAndTokens(normalized);
    }

    private async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
        const payload = { sub: user.id, email: user.email, role: user.role };

        const accessTokenExpiresIn = (this.configService.get<string>('jwt.expiresIn') || '1h') as StringValue;
        const refreshTokenExpiresIn = (this.configService.get<string>('jwt.refreshExpiresIn') || '7d') as StringValue;
        const accessSecret = this.configService.get<string>('jwt.secret') || 'change-me';
        const refreshSecret = this.configService.get<string>('jwt.refreshSecret') || accessSecret;

        const accessToken = await this.jwtService.signAsync(payload, {
            secret: accessSecret,
            expiresIn: accessTokenExpiresIn,
        });

        const refreshToken = await this.jwtService.signAsync(payload, {
            secret: refreshSecret,
            expiresIn: refreshTokenExpiresIn,
        });

        return { accessToken, refreshToken };
    }

    private async verifyGoogleIdToken(idToken: string): Promise<TokenPayload> {
        const ticket = await this.googleClient.verifyIdToken({
            idToken,
            audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
        });

        const payload = ticket.getPayload();
        if (!payload) {
            throw new UnauthorizedException('Invalid Google token');
        }

        return payload;
    }

    private async createGoogleUserAndTokens(profile: {
        providerId?: string;
        email?: string;
        name?: string | null;
        avatarUrl?: string;
    }): Promise<{ user: User; tokens: { accessToken: string; refreshToken: string } }> {
        if (!profile.email) {
            throw new UnauthorizedException('Google account does not have an email');
        }

        if (!profile.providerId) {
            throw new UnauthorizedException('Google account identifier missing');
        }

        const user = await this.usersService.upsertOAuthUser({
            provider: 'google',
            providerId: profile.providerId,
            email: profile.email,
            name: profile.name || profile.email,
            avatarUrl: profile.avatarUrl,
        });

        const tokens = await this.generateTokens(user);
        return { user, tokens };
    }
}
