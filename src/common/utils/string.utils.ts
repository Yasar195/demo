/**
 * Convert string to slug (URL-friendly format)
 */
export function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Capitalize first letter of a string
 */
export function capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Truncate string to specified length
 */
export function truncate(text: string, length: number, suffix = '...'): string {
    if (text.length <= length) {
        return text;
    }
    return text.substring(0, length - suffix.length) + suffix;
}

/**
 * Generate random string
 */
export function randomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Check if string is empty or whitespace
 */
export function isEmptyOrWhitespace(text: string): boolean {
    return !text || text.trim().length === 0;
}
