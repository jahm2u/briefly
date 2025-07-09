import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { MessagesModule } from './core/modules/messages/messages.module';
import { HealthController } from './core/controllers/health.controller';
import { ApiValidatorUtil } from './core/utils/api-validator.util';

/**
 * Main application module that brings together all services and controllers
 */
@Module({
  imports: [
    // Load environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env',
    }),
    // Enable scheduling capabilities
    ScheduleModule.forRoot(),
    // Import the messages module
    MessagesModule,
  ],
  controllers: [HealthController],
  providers: [
    // Utility for API validation
    ApiValidatorUtil,
  ],
})
export class AppModule {}
