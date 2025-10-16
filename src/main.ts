import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 3000;
  const host = process.env.HOST ?? 'localhost';

  // Enable CORS for frontend integration
  app.enableCors();

  await app.listen(port, host);

  const logger = new Logger('Bootstrap');
  logger.log(`🚀 Application is running on: http://${host}:${port}`);
  logger.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`🔧 PORT from env: ${process.env.PORT}`);
  logger.log(`🏠 HOST from env: ${process.env.HOST}`);
}
bootstrap();
