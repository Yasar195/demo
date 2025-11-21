import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseResponseDto } from '../dto/base-response.dto';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: HttpException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const status = exception.getStatus();
        const exceptionResponse = exception.getResponse();

        const errorMessage =
            typeof exceptionResponse === 'string'
                ? exceptionResponse
                : (exceptionResponse as any).message || 'An error occurred';

        const errorResponse = BaseResponseDto.error(
            Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage,
            exception.message,
        );
        errorResponse.path = request.url;

        this.logger.error(
            `HTTP Exception: ${request.method} ${request.url} - Status: ${status} - Message: ${errorMessage}`,
        );

        response.status(status).json(errorResponse);
    }
}
