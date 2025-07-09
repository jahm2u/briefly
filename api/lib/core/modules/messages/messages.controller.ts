import { Controller, Post, HttpStatus, HttpCode } from '@nestjs/common';
import { SchedulerService } from '../../services/scheduler.service';

/**
 * Controller for manually triggering message sending
 */
@Controller('messages')
export class MessagesController {
  constructor(private readonly schedulerService: SchedulerService) {}

  /**
   * Endpoint to trigger the afternoon message
   * Expected to be called after the final meeting of the day ends
   */
  @Post('afternoon')
  @HttpCode(HttpStatus.OK)
  async triggerAfternoonMessage(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      await this.schedulerService.sendAfternoonMessage();
      return {
        success: true,
        message: 'Afternoon message triggered successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to trigger afternoon message: ${error.message}`,
      };
    }
  }

  /**
   * Endpoint to manually trigger the morning message (for testing purposes)
   */
  @Post('morning')
  @HttpCode(HttpStatus.OK)
  async triggerMorningMessage(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      await this.schedulerService.sendMorningMessage();
      return {
        success: true,
        message: 'Morning message triggered successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to trigger morning message: ${error.message}`,
      };
    }
  }

  /**
   * Endpoint to manually trigger the evening message (for testing purposes)
   */
  @Post('evening')
  @HttpCode(HttpStatus.OK)
  async triggerEveningMessage(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      await this.schedulerService.sendEveningMessage();
      return {
        success: true,
        message: 'Evening message triggered successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to trigger evening message: ${error.message}`,
      };
    }
  }
}
