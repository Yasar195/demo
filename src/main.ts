import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, LogLevel, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
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
    return ['error', 'warn'];
  }

  const levels = raw
    .split(',')
    .map((level) => level.trim() as LogLevel)
    .filter((level): level is LogLevel => allowedLogLevels.includes(level));

  return levels.length > 0 ? levels : ['error', 'warn'];
}

async function bootstrap() {

  const tmpApp = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const vault = tmpApp.get(VaultService);

  await vault.logVaultResponse(); 
  await tmpApp.close();

  const app = await NestFactory.create(AppModule, {
    logger: resolveLogLevels(),
  });
  const logger = new Logger('Bootstrap');

  const configService = app.get(ConfigService);
  const vaultService = app.get(VaultService);

  await vaultService.logVaultResponse()

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

  // Vault initialization
  try {
    await vaultService.logVaultResponse();
  } catch (error) {
    console.error('Failed to fetch Vault data:', error);
  }

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
}
bootstrap();
