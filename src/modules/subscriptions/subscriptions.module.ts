import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import {
    SubscriptionPlanRepository,
    StoreSubscriptionRepository,
    SubscriptionPaymentRepository,
    SubscriptionHistoryRepository,
} from './repositories';
import { NotificationsModule } from '../notifications/notifications.module';
import { SseModule } from '../sse/sse.module';
import { StoreModule } from '../store/store.module';

@Module({
    imports: [NotificationsModule, SseModule, StoreModule],
    controllers: [SubscriptionsController],
    providers: [
        SubscriptionsService,
        SubscriptionPlanRepository,
        StoreSubscriptionRepository,
        SubscriptionPaymentRepository,
        SubscriptionHistoryRepository,
    ],
    exports: [SubscriptionsService], // Export for use in guards and other modules
})
export class SubscriptionsModule { }
