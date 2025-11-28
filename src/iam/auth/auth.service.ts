import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { StringValue } from 'ms';
import { UsersService } from '../../modules/users/users.service';
import { User } from '../../modules/users/entities/user.entity';
import { hashPassword } from '../../common/utils/crypto.utils';

type AuthTokens = { accessToken: string; refreshToken: string };
type AuthResult = { user: Omit<User, 'password'>; tokens: AuthTokens };

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

    async loginWithGoogleIdToken(idToken: string): Promise<AuthResult> {
        const payload = await this.verifyGoogleIdToken(idToken);
        const normalized = {
            providerId: payload.sub,
            email: payload.email,
            name: payload.name || payload.given_name || payload.email,
            avatarUrl: payload.picture,
        };

        return this.createGoogleUserAndTokens(normalized);
    }

    async loginWithEmailPassword(email: string, password: string): Promise<AuthResult> {
        const user = await this.usersService.findByEmail(email);
        if (!user || !user.password) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const hashedInput = hashPassword(password);
        if (hashedInput !== user.password) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const tokens = await this.generateTokens(user);
        return { user: this.sanitizeUser(user), tokens };
    }

    async getProfile(userId: string): Promise<Omit<User, 'password'>> {
        const user = await this.usersService.findById(userId);
        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        const { password, ...safeUser } = user;
        return safeUser;
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

        await this.usersService.updateRefreshToken(user.id, hashPassword(refreshToken));

        return { accessToken, refreshToken };
    }

    private async verifyGoogleIdToken(idToken: string): Promise<TokenPayload> {
        const ticket = await this.googleClient.verifyIdToken({
            idToken,
            audience: this.configService.get<string>('google.clientId'),
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
    }): Promise<AuthResult> {
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
        return { user: this.sanitizeUser(user), tokens };
    }

    private sanitizeUser(user: User): Omit<User, 'password'> {
        // Remove password before returning user
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...safeUser } = user;
        return safeUser;
    }

    async refreshTokens(refreshToken: string): Promise<AuthTokens> {
        try {
            const payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: this.configService.get<string>('jwt.refreshSecret'),
            });

            const user = await this.usersService.findById(payload.sub);
            if (!user || !user.hashedRefreshToken) {
                throw new UnauthorizedException('Access denied');
            }

            const refreshTokenMatches = hashPassword(refreshToken) === user.hashedRefreshToken;
            if (!refreshTokenMatches) {
                throw new UnauthorizedException('Access denied');
            }

            const tokens = await this.generateTokens(user);
            return tokens;
        } catch (error) {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    async logout(userId: string): Promise<void> {
        await this.usersService.updateRefreshToken(userId, null);
    }
}
