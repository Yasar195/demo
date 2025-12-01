import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, LogLevel, Logger, INestApplicationContext, Module } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigModule } from './config/config.module';
import { VaultModule } from './integrations/vault/vault.module';
import { VaultService } from './integrations/vault/vault.service';
import { HttpExceptionFilter, AllExceptionsFilter } from './common/filters';
import { LoggingInterceptor, TransformInterceptor } from './common/interceptors';
import { PrismaService } from './database/prisma.service';
import { hashPassword } from './common/utils/crypto.utils';
import { UserRole } from '@prisma/client';

const allowedLogLevels: LogLevel[] = ['log', 'error', 'warn', 'debug', 'verbose'];

function resolveLogLevels(): LogLevel[] {
  const raw = process.env.APP_LOG_LEVELS;
  if (!raw) {
    return ['error', 'warn', 'log', 'debug', 'verbose'];
  }

  const levels = raw
    .split(',')
    .map((level) => level.trim() as LogLevel)
    .filter((level): level is LogLevel => allowedLogLevels.includes(level));

  return levels.length > 0 ? levels : ['error', 'warn', 'log'];
}

@Module({
  imports: [ConfigModule, VaultModule],
})
class VaultInitModule { }

async function initializeVault(logger: Logger): Promise<void> {
  const context = await NestFactory.createApplicationContext(VaultInitModule, { logger: false });
  // const context = await NestFactory.createApplicationContext(VaultInitModule);
  const vaultService = context.get(VaultService);

  if (!vaultService.isConfigured()) {
    logger.warn('Vault not configured; skipping secret sync');
    await context.close();
    return;
  }

  try {
    await vaultService.logVaultResponse();
    logger.log('Vault secrets loaded');
  } catch (error) {
    logger.error(
      'Failed to fetch Vault data; continuing with existing environment variables',
      error as Error,
    );
  } finally {
    await context.close();
  }
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  await initializeVault(logger);

  const app = await NestFactory.create(AppModule, {
    logger: resolveLogLevels(),
  });
  // const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  configService.get('APP_PORT')

  const prismaService = app.get(PrismaService);
  await prismaService.$connect();

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

  // Seed default admin if database is empty
  try {
    const usersCount = await prismaService.user.count();
    if (usersCount === 0) {
      await prismaService.user.upsert({
        where: { email: 'admin@sustify.com' },
        update: {},
        create: {
          email: 'admin@sustify.com',
          name: 'System Admin',
          password: hashPassword('Admin@123'),
          role: UserRole.ADMIN,
          provider: 'local',
        },
      });
      logger.log('Default admin user created (admin@sustify.com)');
    }
  } catch (error) {
    logger.error('Failed to ensure default admin user', error as Error);
  }

  // Start server
  const port = configService.get('APP_PORT') || 3000;
  await app.listen(port);
  logger.log(`Application is running on port ${port}`);
}
bootstrap();
