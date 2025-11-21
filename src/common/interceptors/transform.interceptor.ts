import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseResponseDto } from '../dto/base-response.dto';

@Injectable()
export class TransformInterceptor<T>
    implements NestInterceptor<T, BaseResponseDto<T>> {
    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<BaseResponseDto<T>> {
        const request = context.switchToHttp().getRequest();

        return next.handle().pipe(
            map((data) => {
                // If data is already a BaseResponseDto, return it as is
                if (data instanceof BaseResponseDto) {
                    data.path = request.url;
                    return data;
                }

                // Otherwise, wrap it in a success response
                const response = BaseResponseDto.success(data);
                response.path = request.url;
                return response;
            }),
        );
    }
}
