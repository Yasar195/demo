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
