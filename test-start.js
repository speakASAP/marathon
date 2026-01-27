require('reflect-metadata');
const { NestFactory } = require('@nestjs/core');
const { Logger } = require('@nestjs/common');
const AppModule = require('./dist/app.module').AppModule;
const MarathonLogger = require('./dist/shared/marathon-logger').MarathonLogger;
const { validateEnv } = require('./dist/shared/validate-env');

async function bootstrap() {
  try {
    console.log('Validating environment...');
    validateEnv();
    console.log('Environment validated');
    
    console.log('Creating NestJS app...');
    const app = await NestFactory.create(AppModule, {
      logger: new MarathonLogger(),
    });
    console.log('App created');
    
    app.enableShutdownHooks();
    app.setGlobalPrefix('api/v1', { exclude: ['health'] });
    const port = Number(process.env.PORT);
    console.log(`Starting server on port ${port}...`);
    await app.listen(port);
    Logger.log(`Marathon started on port ${port}`, 'Bootstrap');
  } catch (error) {
    console.error('Bootstrap error:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('Uncaught bootstrap error:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
});
