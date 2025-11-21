import * as crypto from 'crypto';

/**
 * Hash a password using bcrypt-like approach (placeholder - use bcrypt in production)
 */
export function hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Generate a random token
 */
export function generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate UUID v4
 */
export function generateUUID(): string {
    return crypto.randomUUID();
}

/**
 * Hash data with SHA256
 */
export function sha256Hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate HMAC
 */
export function generateHMAC(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
}
