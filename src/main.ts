import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { VaultService } from './integrations/vault/vault.service';
import { HttpExceptionFilter, AllExceptionsFilter } from './common/filters';
import { LoggingInterceptor, TransformInterceptor } from './common/interceptors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get services
  const configService = app.get(ConfigService);
  const vaultService = app.get(VaultService);

  // Global filters
  app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // API prefix
  const apiPrefix = configService.get('app.apiPrefix') || 'api';
  app.setGlobalPrefix(apiPrefix);

  // CORS
  app.enableCors();

  // Vault initialization
  try {
    await vaultService.logVaultResponse();
  } catch (error) {
    console.error('Failed to fetch Vault data:', error);
  }

  // Start server
  const port = configService.get('APP_PORT') || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/${apiPrefix}`);
}
bootstrap();

