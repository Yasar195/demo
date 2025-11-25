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

        const responseMessage =
            typeof exceptionResponse === 'string'
                ? exceptionResponse
                : (exceptionResponse as any).message;

        const responseError =
            typeof exceptionResponse === 'string'
                ? undefined
                : (exceptionResponse as any).error;

        const errorMessage =
            (Array.isArray(responseMessage) && responseMessage.join(', ')) ||
            (Array.isArray(responseError) && responseError.join(', ')) ||
            (responseError as string) ||
            (responseMessage as string) ||
            'An error occurred';

        const messageText =
            typeof responseMessage === 'string'
                ? responseMessage
                : typeof responseError === 'string'
                    ? responseError
                    : Array.isArray(responseMessage)
                        ? 'Validation failed'
                        : exception.message;

        const errorResponse = BaseResponseDto.error(
            errorMessage,
            messageText,
        );
        errorResponse.path = request.url;

        this.logger.error(
            `HTTP Exception: ${request.method} ${request.url} - Status: ${status} - Message: ${errorMessage}`,
        );

        response.status(status).json(errorResponse);
    }
}
