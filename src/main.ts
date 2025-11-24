import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, LogLevel } from '@nestjs/common';
import { AppModule } from './app.module';
import { VaultService } from './integrations/vault/vault.service';
import { HttpExceptionFilter, AllExceptionsFilter } from './common/filters';
import { LoggingInterceptor, TransformInterceptor } from './common/interceptors';

const allowedLogLevels: LogLevel[] = ['log', 'error', 'warn', 'debug', 'verbose'];

function resolveLogLevels(): LogLevel[] {
  const raw = process.env.APP_LOG_LEVELS;
  if (!raw) {
    return ['error', 'warn'];
  }

  const levels = raw
    .split(',')
    .map((level) => level.trim() as LogLevel)
    .filter((level): level is LogLevel => allowedLogLevels.includes(level));

  return levels.length > 0 ? levels : ['error', 'warn'];
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: resolveLogLevels(),
  });

  // Get services
  const configService = app.get(ConfigService);
  const vaultService = app.get(VaultService);

  // Global filters
  app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());

  // Global interceptors
  const enableHttpLogging = process.env.HTTP_LOGS === 'true';
  const interceptors = enableHttpLogging
    ? [new LoggingInterceptor(), new TransformInterceptor()]
    : [new TransformInterceptor()];
  app.useGlobalInterceptors(...interceptors);

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
}
bootstrap();
