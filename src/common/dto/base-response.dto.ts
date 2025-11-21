import { ApiResponse } from '../interfaces/api-response.interface';

export class BaseResponseDto<T = any> implements ApiResponse<T> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
    timestamp: string;
    path?: string;

    constructor(success: boolean, data?: T, message?: string, error?: string) {
        this.success = success;
        this.data = data;
        this.message = message;
        this.error = error;
        this.timestamp = new Date().toISOString();
    }

    static success<T>(data: T, message?: string): BaseResponseDto<T> {
        return new BaseResponseDto(true, data, message);
    }

    static error(error: string, message?: string): BaseResponseDto {
        return new BaseResponseDto(false, undefined, message, error);
    }
}
