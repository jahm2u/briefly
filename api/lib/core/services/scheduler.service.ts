import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TodoistService } from './todoist.service';
import { ICalService } from './ical.service';
import { TelegramService } from './telegram.service';
import { MessagingService } from '../../logic/messaging/messaging.service';
import { GroupingService } from '../../logic/grouping/grouping.service';
import { Task } from '../models/task.model';

/**
 * Service for scheduling and triggering the daily messages
 */
@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);
  private lastMorningDate: Date | null = null;
  private morningTasks: Task[] = [];

  constructor(
    private readonly todoistService: TodoistService,
    private readonly icalService: ICalService,
    private readonly telegramService: TelegramService,
    private readonly messagingService: MessagingService,
    private readonly groupingService: GroupingService,
  ) {}

  onModuleInit() {
    const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now = new Date();
    this.logger.log(
      `Scheduler initialized. Node.js system timezone: ${systemTimezone}`,
    );
    this.logger.log(
      `Current time - UTC: ${now.toISOString()}, BRT: ${now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })}`,
    );
  }

  /**
   * Scheduled job for sending the morning message at 7 AM (BRT)
   * Delegates to MessagingService for consistent logic and API filtering
   */
  @Cron('0 0 7 * * *', {
    timeZone: 'America/Sao_Paulo', // BRT timezone
  })
  async sendMorningMessage(): Promise<void> {
    const now = new Date();
    this.logger.log(
      `Sending morning message... Container time: ${now.toISOString()}, BRT time: ${now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })}`,
    );

    try {
      // Record the current date for reference
      this.lastMorningDate = now;

      // Delegate to the MessagingService which has the proper API filtering logic
      await this.messagingService.sendMorningMessage();

      this.logger.log('Morning message sent successfully');
    } catch (error) {
      this.logger.error(`Failed to send morning message: ${error.message}`);
    }
  }

  /**
   * Scheduled job for sending the afternoon message at 3:30 PM (BRT)
   */
  @Cron('0 30 15 * * 1-5', {
    timeZone: 'America/Sao_Paulo', // BRT timezone - only on weekdays
  })
  async sendScheduledAfternoonMessage(): Promise<void> {
    const now = new Date();
    this.logger.log(
      `Sending scheduled afternoon message... Container time: ${now.toISOString()}, BRT time: ${now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })}`,
    );
    await this.sendAfternoonMessage();
  }

  /**
   * Scheduled job for sending the evening message at 8 PM (BRT)
   * Delegates to MessagingService for consistent logic and API filtering
   */
  @Cron('0 0 20 * * *', {
    timeZone: 'America/Sao_Paulo', // BRT timezone
  })
  async sendEveningMessage(): Promise<void> {
    const now = new Date();
    this.logger.log(
      `Sending evening message... Container time: ${now.toISOString()}, BRT time: ${now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })}`,
    );

    try {
      // Delegate to the MessagingService which has the proper API filtering logic
      await this.messagingService.sendEveningMessage();

      this.logger.log('Evening message sent successfully');
    } catch (error) {
      this.logger.error(`Failed to send evening message: ${error.message}`);
    }
  }

  /**
   * Manually trigger the afternoon message after the final meeting ends
   * This is expected to be called from an endpoint or webhook
   * Delegates to MessagingService for consistent logic and API filtering
   */
  async sendAfternoonMessage(): Promise<void> {
    const now = new Date();
    this.logger.log(
      `Sending afternoon message... Container time: ${now.toISOString()}, BRT time: ${now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })}`,
    );

    try {
      // Delegate to the MessagingService which has the proper API filtering logic
      await this.messagingService.sendAfternoonMessage();

      this.logger.log('Afternoon message sent successfully');
    } catch (error) {
      this.logger.error(`Failed to send afternoon message: ${error.message}`);
    }
  }
}
