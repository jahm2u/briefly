import { Module, Global } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { ConfigService } from '../services/config.service';
import { ApiValidatorUtil } from '../utils/api-validator.util';

/**
 * Global configuration module that provides access to environment variables
 * and configuration services throughout the application
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    }),
  ],
  providers: [ConfigService, ApiValidatorUtil],
  exports: [ConfigService, ApiValidatorUtil],
})
export class CoreConfigModule {}
