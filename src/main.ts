import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { MarathonLogger } from './shared/marathon-logger';
import { validateEnv } from './shared/validate-env';

async function bootstrap(): Promise<void> {
  validateEnv();
  const app = await NestFactory.create(AppModule, {
    logger: new MarathonLogger(),
  });
  app.enableShutdownHooks();
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  const port = Number(process.env.PORT);
  await app.listen(port);
  Logger.log(`Marathon started on port ${port}`, 'Bootstrap');
}

bootstrap().catch((error) => {
  Logger.error('Marathon bootstrap failed', error);
  process.exit(1);
});
