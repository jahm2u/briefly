import { Module } from '@nestjs/common';
import { ApiValidatorUtil } from './api-validator.util';

/**
 * Module that provides utility services
 */
@Module({
  providers: [ApiValidatorUtil],
  exports: [ApiValidatorUtil],
})
export class UtilsModule {}
