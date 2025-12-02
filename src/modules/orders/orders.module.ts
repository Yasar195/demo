import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersRepository } from './repositories';
import { S3Module } from '../../integrations/s3/s3.module';
import { SseModule } from '../sse/sse.module';
import { GiftCardsModule } from '../gift-cards/gift-cards.module';

@Module({
    imports: [S3Module, SseModule, GiftCardsModule],
    controllers: [OrdersController],
    providers: [OrdersService, OrdersRepository],
    exports: [OrdersService],
})
export class OrdersModule { }
