import { HttpException, HttpStatus } from '@nestjs/common';

export class ValidationException extends HttpException {
    constructor(message: string | string[]) {
        super(
            {
                message: Array.isArray(message) ? message : [message],
                error: 'Validation Error',
            },
            HttpStatus.BAD_REQUEST,
        );
    }
}
