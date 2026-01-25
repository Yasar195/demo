import { Module } from '@nestjs/common';
import { VoucherRequestController } from './vouchers.controller';
import { VouchersService } from './vouchers.service';
import { VouchersRepository } from './repositories/vouchers.repository';
import { VoucherRequestRepository } from './repositories/voucher-request.repository';
import { StoreRepository } from '../store/repositories';
import { UsersRepository } from '../users/repositories';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsRepository, DeviceTokenRepository } from '../notifications/repositories';
import { SseModule } from '../sse/sse.module';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { StoreSubscriptionRepository, SubscriptionHistoryRepository, SubscriptionPaymentRepository, SubscriptionPlanRepository } from '../subscriptions/repositories';
import { UserPurchasedRepository } from '../users/repositories/user.purchased.repository';

@Module({
    imports: [SseModule],
    controllers: [VoucherRequestController],
    providers: [
        VouchersService,
        VouchersRepository,
        VoucherRequestRepository,
        StoreRepository,
        UsersRepository,
        NotificationsService,
        NotificationsRepository,
        DeviceTokenRepository,
        SubscriptionsService,
        SubscriptionPlanRepository,
        StoreSubscriptionRepository,
        SubscriptionPaymentRepository,
        SubscriptionHistoryRepository,
        UserPurchasedRepository
    ],
    exports: [VouchersService, VouchersRepository, VoucherRequestRepository],
})
export class VouchersModule { }
