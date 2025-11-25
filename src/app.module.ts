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
import { IamModule } from './iam/iam.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    CommonModule,
    ValidatorsModule,
    VaultModule,
    HealthModule,
    UsersModule,
    VouchersModule,
    IamModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
