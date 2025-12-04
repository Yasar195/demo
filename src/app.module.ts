import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { CommonModule } from './common/common.module';
import { ValidatorsModule } from './validators/validators.module';
import { VaultModule } from './integrations/vault/vault.module';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './modules/users/users.module';
import { VouchersModule } from './modules/vouchers/vouchers.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { IamModule } from './iam/iam.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { FirebaseModule } from './integrations/firebase';
import { S3Module } from './integrations/s3';
import { UploadsModule } from './modules/uploads/uploads.module';
import { StoreModule } from './modules/store/store.module';
import { SseModule } from './modules/sse/sse.module';
import { QrCodeModule } from './common/qrcode/qrcode.module';
import { AdminModule } from './modules/admin/admin.module';
import { OrdersModule } from './modules/orders/orders.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { RedisModule } from './integrations/redis';
import { GiftCardsModule } from './modules/gift-cards/gift-cards.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { CartsModule } from './modules/carts/carts.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000, // 60 seconds
      limit: 100, // 100 requests per ttl
    }]),
    ConfigModule,
    DatabaseModule,
    RedisModule,
    FirebaseModule,
    S3Module,
    CommonModule,
    QrCodeModule,
    ValidatorsModule,
    VaultModule,
    HealthModule,
    UsersModule,
    VouchersModule,
    PaymentsModule,
    NotificationsModule,
    UploadsModule,
    StoreModule,
    SseModule,
    AdminModule,
    OrdersModule,
    GiftCardsModule,
    SchedulerModule,
    IamModule,
    SubscriptionsModule,
    CartsModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
