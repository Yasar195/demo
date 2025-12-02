import { Module } from '@nestjs/common';
import { SseService } from './sse.service';
import { SseController } from './sse.controller';
import { RedisModule } from '../../integrations/redis';

@Module({
    imports: [RedisModule],
    controllers: [SseController],
    providers: [SseService],
    exports: [SseService],
})
export class SseModule { }
