export interface JwtConfig {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
}

export interface VaultConfig {
    address: string;
    token: string;
}

export interface GoogleOAuthConfig {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
}

export interface StripeConfig {
    secretKey: string;
    apiVersion?: string;
    webhookSecret?: string;
}
