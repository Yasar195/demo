import { Module } from '@nestjs/common';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';
import { StoreRequestRepository, StoreRepository } from './repositories';
import { UsersRepository } from '../users/repositories';
import { NotificationsService } from '../notifications/notifications.service';
import { DeviceTokenRepository, NotificationsRepository } from '../notifications/repositories';
import { SseService } from '../sse/sse.service';
import { PaymentsModule } from '../payments/payments.module';
import { VouchersModule } from '../vouchers/vouchers.module';

@Module({
    imports: [PaymentsModule, VouchersModule],
    controllers: [StoreController],
    providers: [StoreService, StoreRequestRepository, StoreRepository, UsersRepository, NotificationsRepository, NotificationsService, DeviceTokenRepository, SseService],
    exports: [StoreService, StoreRequestRepository, StoreRepository],
})
export class StoreModule { }
