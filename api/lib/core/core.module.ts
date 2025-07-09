import { Module, Global } from '@nestjs/common';
import { ServicesModule } from './services/services.module';
import { UtilsModule } from './utils/utils.module';
import { MessagesModule } from './modules/messages/messages.module';

/**
 * Core module that encapsulates all core functionality
 * following the Clean Architecture pattern
 */
@Global()
@Module({
  imports: [ServicesModule, UtilsModule, MessagesModule],
  exports: [ServicesModule, UtilsModule, MessagesModule],
})
export class CoreModule {}
