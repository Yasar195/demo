import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { StringValue } from 'ms';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../../modules/users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
    imports: [
        PassportModule.register({ defaultStrategy: 'jwt', session: false }),
        JwtModule.registerAsync({
            useFactory: (configService: ConfigService) => {
                const secret = configService.get<string>('jwt.secret') || 'change-me';
                const expiresIn = (configService.get<string>('jwt.expiresIn') || '1h') as StringValue;

                return {
                    secret,
                    signOptions: { expiresIn },
                };
            },
            inject: [ConfigService],
        }),
        UsersModule,
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy, JwtAuthGuard],
    exports: [AuthService],
})
export class AuthModule { }
