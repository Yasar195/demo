import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    FirebaseModule,
    S3Module,
    CommonModule,
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
    IamModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
