import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { GroupingService } from '../../../logic/grouping/grouping.service';
import { MessagingService } from '../../../logic/messaging/messaging.service';
import { SchedulerService } from '../../services/scheduler.service';
import { TodoistService } from '../../services/todoist.service';
import { ICalService } from '../../services/ical.service';
import { TelegramService } from '../../services/telegram.service';
import { ConfigService } from '../../services/config.service';
import { ClaudeCliService } from '../../../logic/claude/claude-cli.service';

/**
 * Module for the messaging functionality
 * Encapsulates message-related controllers and dependencies
 */
@Module({
  controllers: [MessagesController],
  providers: [
    SchedulerService,
    GroupingService,
    MessagingService,
    TodoistService,
    ICalService,
    TelegramService,
    ConfigService,
    ClaudeCliService,
  ],
  exports: [SchedulerService, MessagingService],
})
export class MessagesModule {
  /**
   * When the module is initialized, connect the MessagingService to TelegramService
   * This enables the command triggers (/morning, /afternoon, /evening)
   * Also inject Claude services for /claude command handling
   */
  constructor(
    private readonly telegramService: TelegramService,
    private readonly messagingService: MessagingService,
    private readonly claudeCliService: ClaudeCliService,
  ) {
    // Inject the messaging service into the telegram service
    // This allows telegram commands to trigger messaging routines
    this.telegramService.setMessagingService(this.messagingService);
    
    // Inject Claude services for /claude command handling
    this.telegramService.setClaudeServices(this.claudeCliService);
  }
}
