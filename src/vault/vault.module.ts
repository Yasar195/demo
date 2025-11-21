import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VaultService } from './vault.service';

@Module({
  imports: [ConfigModule],
  providers: [VaultService]
})
export class VaultModule {}
