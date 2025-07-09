import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../lib/app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    logger.log('Creating NestJS application...');
    const app = await NestFactory.create(AppModule);

    logger.log('Setting global prefix...');
    // Set global prefix for API routes
    app.setGlobalPrefix('api');

    // Get port from environment variable or use 5100 as default
    const port = process.env.PORT || 5100;
    logger.log(`Starting application on port ${port}...`);

    await app.listen(port, '0.0.0.0');
    logger.log(`✅ Briefly API is running on port ${port}`);
    console.log(`✅ Briefly API is running on port ${port}`);
  } catch (error) {
    logger.error('❌ Failed to start application:', error);
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('❌ Bootstrap failed:', error);
  process.exit(1);
});
