import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { MarathonLogger } from './shared/marathon-logger';
import { validateEnv } from './shared/validate-env';

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

async function bootstrap(): Promise<void> {
  try {
    console.log('Starting Marathon bootstrap...');
    validateEnv();
    console.log('Environment validated');
    console.log('Creating NestJS app...');
    const app = await NestFactory.create(AppModule, {
      logger: new MarathonLogger(),
    });
    console.log('App created');
    app.enableShutdownHooks();
    app.setGlobalPrefix('api/v1', { exclude: ['health', 'info'] });
    const port = Number(process.env.PORT);
    console.log(`Starting server on port ${port}...`);
    await app.listen(port);
    Logger.log(`Marathon started on port ${port}`, 'Bootstrap');
  } catch (error) {
    console.error('Bootstrap error:', error);
    console.error('Error stack:', (error as Error).stack);
    Logger.error('Marathon bootstrap failed', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('Uncaught bootstrap error:', error);
  console.error('Error stack:', (error as Error).stack);
  Logger.error('Marathon bootstrap failed', error);
  process.exit(1);
});
