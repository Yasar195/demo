import { AppConfig } from './interfaces/app-config.interface';
import { DatabaseConfig } from './interfaces/database-config.interface';
import { JwtConfig, VaultConfig, GoogleOAuthConfig, StripeConfig } from './interfaces/config.interface';

export default () => ({
    app: {
        port: parseInt(process.env.APP_PORT || '3000', 10),
        environment: process.env.NODE_ENV || 'development',
        apiPrefix: process.env.API_PREFIX || 'api',
    } as AppConfig,

    database: {
        type: process.env.DB_TYPE || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_DATABASE || 'sustify',
        synchronize: process.env.DB_SYNCHRONIZE === 'true',
        logging: process.env.DB_LOGGING === 'true',
    } as DatabaseConfig,

    jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key',
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    } as JwtConfig,

    vault: {
        address: process.env.VAULT_ADDR || process.env.VAULT_URL || '',
        token: process.env.VAULT_TOKEN || '',
    } as VaultConfig,

    google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        callbackUrl: process.env.GOOGLE_CALLBACK_URL || '',
    } as GoogleOAuthConfig,

    stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY || '',
        apiVersion: process.env.STRIPE_API_VERSION || '2024-06-20',
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    } as StripeConfig,
});
