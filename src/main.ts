import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { VaultService } from './vault/vault.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const vaultService = app.get(VaultService);

  try {
    await vaultService.logVaultResponse();
  } catch (error) {
    console.error('Failed to fetch Vault data:', error);
  }

  const configService = app.get(ConfigService);
  const port = Number(configService.get('APP_PORT')) || 3000;
  await app.listen(port);
}
bootstrap();
