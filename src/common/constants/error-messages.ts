export const ERROR_MESSAGES = {
    // Generic errors
    INTERNAL_SERVER_ERROR: 'An internal server error occurred',
    BAD_REQUEST: 'Bad request',
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Access forbidden',
    NOT_FOUND: 'Resource not found',
    VALIDATION_ERROR: 'Validation failed',

    // Auth errors
    INVALID_CREDENTIALS: 'Invalid credentials',
    TOKEN_EXPIRED: 'Token has expired',
    TOKEN_INVALID: 'Invalid token',
    USER_NOT_FOUND: 'User not found',
    USER_ALREADY_EXISTS: 'User already exists',

    // Database errors
    DATABASE_ERROR: 'Database operation failed',
    DUPLICATE_ENTRY: 'Duplicate entry',
    RECORD_NOT_FOUND: 'Record not found',
} as const;
