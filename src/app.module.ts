import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonsModule } from './commons/commons.module';
import { IamModule } from './iam/iam.module';
import { ValidatorsModule } from './validators/validators.module';
import { VaultModule } from './vault/vault.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), CommonsModule, IamModule, ValidatorsModule, VaultModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
