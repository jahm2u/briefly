import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../../core/services/config.service';
import { Task } from '../../core/models/task.model';
import { CalendarEvent } from '../../core/models/calendar-event.model';
import { GroupingService } from '../grouping/grouping.service';
import { TelegramService } from '../../core/services/telegram.service';
import { TodoistService } from '../../core/services/todoist.service';
import { ICalService } from '../../core/services/ical.service';
import OpenAI from 'openai';

/**
 * Service for formatting messages using GPT
 */
@Injectable()
export class MessagingService {
  private openaiClient: OpenAI;
  private readonly logger = new Logger(MessagingService.name);
  private morningTasksIds: string[] = [];

  /**
   * Escapes special characters for Telegram MarkdownV2
   * Minimal escaping to preserve readability
   * @private
   */
  private escapeMarkdown(text: string): string {
    // For task content, we only need to escape the absolute minimum
    // Since we're already using proper formatting with * for bold and _ for italic
    return text.replace(/([_*\[\]`])/g, '\\$1'); // Only escape critical markdown characters
  }

  /**
   * Cleans up task content by removing broken markdown link syntax
   * Converts [text](url) to just show the URL
   * @private
   */
  private cleanTaskContent(content: string): string {
    // First, remove any ** bold markers
    let cleaned = content.replace(/\*\*/g, '');

    // Then remove markdown link syntax and just show the URL
    // This handles cases like [text](url) or [https://example.com](https://example.com)
    cleaned = cleaned.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$2');

    return cleaned;
  }

  constructor(
    private readonly configService: ConfigService,
    private readonly groupingService: GroupingService,
    private readonly telegramService: TelegramService,
    private readonly todoistService: TodoistService,
    private readonly icalService: ICalService,
  ) {
    // Initialize OpenAI client - this makes it easier to mock in tests
    this.initializeOpenAI();
  }

  /**
   * Initialize the OpenAI client - separated to make it testable
   */
  private initializeOpenAI(): void {
    this.openaiClient = new OpenAI({
      apiKey: this.configService.getOpenAiApiKey(),
    });
  }

  /**
   * Formats the morning message with calendar events and tasks
   * Uses MarkdownV2 format for Telegram
   */
  private async formatMorningMessage(
    calendarEvents: CalendarEvent[],
    tasks: Task[],
  ): Promise<string> {
    this.logger.debug(
      'Formatting morning message with calendar events and tasks',
    );

    // Create the intro message
    const intro = '☀️ *Good Morning!*';
    let message = `${intro}\n\n`;

    // Add calendar events section if there are any
    if (calendarEvents && calendarEvents.length > 0) {
      this.logger.debug(
        `Adding ${calendarEvents.length} calendar events to message`,
      );
      message += `*Today's Calendar*\n`;

      // Sort events by start time
      const sortedEvents = [...calendarEvents].sort(
        (a, b) => a.startTime.getTime() - b.startTime.getTime(),
      );

      // Format each event without location info
      message += sortedEvents
        .map((event) => {
          const eventText = `• ${event.formatForMessage(false)}`;
          this.logger.debug(`Added calendar event: ${eventText}`);
          return eventText;
        })
        .join('\n');
      message += '\n\n';
    } else {
      this.logger.debug('No calendar events to add to morning message');
      message += `*No meetings scheduled for today*\n\n`;
    }

    // Add tasks section if there are any
    if (tasks && tasks.length > 0) {
      this.logger.debug(`Adding ${tasks.length} tasks to morning message`);

      // Group tasks using AI-powered grouping service
      let groupedTasks: Record<string, Task[]>;
      try {
        groupedTasks = await this.groupingService.groupTasks(tasks);
        this.logger.debug('Successfully grouped tasks using AI');
      } catch (error) {
        this.logger.error(`Failed to group tasks with AI: ${error.message}`);
        // Fallback to simple grouping - group all tasks together
        groupedTasks = { Tasks: tasks };
      }

      // Format each task group
      message += `*Today's Focus*\n`;
      for (const [groupName, groupTasks] of Object.entries(groupedTasks)) {
        // Skip empty groups
        if (groupTasks.length === 0) continue;

        // Add group name if not ungrouped
        if (groupName !== 'Ungrouped') {
          message += `\n*${groupName}*\n`;
          this.logger.debug(
            `Adding task group: ${groupName} with ${groupTasks.length} tasks`,
          );
        }

        // Add tasks for this group, sorted by priority (P1 highest to P4 lowest)
        const sortedTasks = [...groupTasks].sort(
          (a, b) => b.priority - a.priority,
        );
        for (const task of sortedTasks) {
          const priorityMarker = task.getPriorityIndicator();
          // Clean up any broken markdown links first, then escape markdown
          const cleanedContent = this.cleanTaskContent(task.content);
          const taskContent = this.escapeMarkdown(cleanedContent);
          const taskLine = `• ${priorityMarker}${taskContent}`;

          message += taskLine;

          // Add the task URL as a clickable link if available
          if (task.url) {
            message += ` [View Task](${task.url})`;
          }

          message += '\n';
          this.logger.debug(`Added task: ${task.content}`);
        }
      }
    } else {
      this.logger.debug('No tasks to add to morning message');
      message += '*No tasks scheduled for today!*\n';
    }

    this.logger.debug('Morning message formatting complete');
    return message;
  }

  /**
   * Formats the afternoon message with completed tasks and remaining tasks
   */
  async formatAfternoonMessage(
    completedTasks: Task[],
    remainingTasks: Task[],
  ): Promise<string> {
    // Group and format remaining tasks
    const groupedRemainingTasks =
      await this.groupingService.groupTasks(remainingTasks);

    // Generate a motivational message based on completed tasks
    const motivationMessage =
      await this.generateMotivationMessage(completedTasks);

    // Build the afternoon message with clean MarkdownV2 formatting
    let message = '🌤️ *Afternoon Update*\n\n';

    // Completed tasks section
    message += '✔️ *Completed*\n';
    if (completedTasks.length === 0) {
      message += '• _Nothing completed yet_\n';
    } else {
      // Sort completed tasks by priority (highest priority first)
      const sortedCompletedTasks = completedTasks.sort(
        (a, b) => b.priority - a.priority,
      );
      sortedCompletedTasks.forEach((task) => {
        const priorityIndicator = task.getPriorityIndicator();
        message += `${priorityIndicator}${task.content}\n`;
      });
    }
    message += '\n';

    // Remaining tasks section
    message += '⏰ *Remaining*\n';
    if (Object.keys(groupedRemainingTasks).length === 0) {
      message += '• _All done\\!_\n';
    } else {
      for (const [category, tasks] of Object.entries(groupedRemainingTasks)) {
        message += `\n*${category}*\n`;
        // Sort tasks by priority within each category (highest priority first)
        const sortedTasks = tasks.sort((a, b) => b.priority - a.priority);
        sortedTasks.forEach((task) => {
          const priorityIndicator = task.getPriorityIndicator();
          // Clean up any broken markdown links first, then escape markdown
          const cleanedContent = this.cleanTaskContent(task.content);
          const taskContent = this.escapeMarkdown(cleanedContent);
          message += `${priorityIndicator}${taskContent}`;

          // Add the task URL as a clickable link if available
          if (task.url) {
            message += ` [View Task](${task.url})`;
          }

          message += '\n';
        });
      }
    }

    // Add motivation message
    if (motivationMessage) {
      message += `\n💭 _${motivationMessage}_\n`;
    }

    return message;
  }

  /**
   * Formats the evening message with completed tasks and inbox tasks requiring triage
   */
  async formatEveningMessage(
    completedTasks: Task[],
    inboxTasks: Task[],
  ): Promise<string> {
    // Build the evening message with clean MarkdownV2 formatting
    let message = '🌙 *Evening Check*\n\n';

    // Completed tasks section
    message += '✔️ *Completed Today*\n';
    if (completedTasks.length === 0) {
      message += '• _Nothing completed today_\n';
    } else {
      // Sort completed tasks by priority (highest priority first)
      const sortedCompletedTasks = completedTasks.sort(
        (a, b) => b.priority - a.priority,
      );
      sortedCompletedTasks.forEach((task) => {
        const priorityIndicator = task.getPriorityIndicator();
        message += `${priorityIndicator}${task.content}\n`;
      });
    }
    message += '\n';

    // Inbox tasks section
    message += '📥 *Inbox Triage*\n';
    if (inboxTasks.length === 0) {
      message += '• _Inbox is empty_\n';
      message += '• _Perfect time to relax\\!_\n';
    } else {
      // Group inbox tasks
      const groupedInboxTasks =
        await this.groupingService.groupTasks(inboxTasks);

      if (Object.keys(groupedInboxTasks).length === 0) {
        message += '• _Inbox is empty_\n';
        message += '• _Perfect time to relax\\!_\n';
      } else {
        for (const [category, tasks] of Object.entries(groupedInboxTasks)) {
          message += `\n*${category}*\n`;
          // Sort tasks by priority within each category (highest priority first)
          const sortedTasks = tasks.sort((a, b) => b.priority - a.priority);
          sortedTasks.forEach((task) => {
            const priorityIndicator = task.getPriorityIndicator();
            const taskContent = this.escapeMarkdown(task.content);
            message += `${priorityIndicator}${taskContent}`;

            // Add the task URL as a clickable link if available
            if (task.url) {
              message += ` [View Task](${task.url})`;
            }

            message += '\n';
          });
        }
        message += '\n💡 _Quick triage time_\n';
      }
    }

    // Generate evening reflection message
    const eveningReflection = await this.generateEveningReflection(
      completedTasks,
      inboxTasks,
    );
    if (eveningReflection) {
      message += `\n🌅 _${eveningReflection}_\n`;
    }

    return message;
  }

  /**
   * Handles the morning message command from Telegram
   * Fetches data, formats message, and sends it
   */
  async sendMorningMessage(): Promise<void> {
    try {
      const currentDate = new Date();
      this.logger.debug(
        `Generating morning message for ${currentDate.toISOString()}`,
      );

      // Fetch calendar events for today with detailed logging
      this.logger.debug('Fetching calendar events for today...');
      const calendarEvents = await this.icalService.getTodayEvents();
      this.logger.log(
        `Found ${calendarEvents.length} calendar events for today`,
      );

      // Log each calendar event to help with debugging
      calendarEvents.forEach((event) => {
        this.logger.debug(
          `Calendar event: "${event.summary}" at ${event.startTime.toISOString()} - ${event.endTime.toISOString()}`,
        );
      });

      // Fetch relevant tasks with improved filtering
      this.logger.debug('Fetching relevant tasks for today...');
      const dueTasks = await this.todoistService.getRelevantTasks();
      this.logger.log(`Found ${dueTasks.length} relevant tasks`);

      // Log each task to help with debugging
      dueTasks.forEach((task) => {
        this.logger.debug(
          `Task: "${task.content}" with priority ${task.priority} due: ${task.dueDate?.toISOString() || 'No date'}`,
        );
      });

      // Format the morning message
      const message = await this.formatMorningMessage(calendarEvents, dueTasks);

      // Send the message via Telegram
      await this.telegramService.sendMessage(message);

      // Store a reference to the tasks for afternoon comparison
      this.morningTasksIds = dueTasks.map((task) => task.id);

      this.logger.log('Morning message sent successfully');
    } catch (error) {
      this.logger.error(`Failed to send morning message: ${error.message}`);
      // Add error details for better debugging
      if (error.stack) {
        this.logger.error(`Stack trace: ${error.stack}`);
      }
      throw error;
    }
  }

  /**
   * Handles the afternoon message command from Telegram
   * Fetches data, formats message, and sends it
   */
  async sendAfternoonMessage(): Promise<void> {
    this.logger.log('Generating afternoon message...');

    try {
      // Set a reference morning date
      const lastMorningDate = new Date();
      lastMorningDate.setHours(7, 0, 0, 0); // Set to 7 AM today

      // Fetch completed tasks since morning
      const completedTasks =
        await this.todoistService.getCompletedTasksSince(lastMorningDate);

      // Get remaining tasks using proper API filter for due tasks excluding inbox
      // This replaces client-side filtering with server-side API filtering
      const remainingTasks =
        await this.todoistService.getRemainingTasksForAfternoon();

      this.logger.debug(
        `📊 AFTERNOON API FILTER RESULT: ${remainingTasks.length} remaining tasks (due today/overdue, excluding inbox)`,
      );
      this.logger.debug(`📊 Completed tasks to show: ${completedTasks.length}`);

      // Format the afternoon message
      const message = await this.formatAfternoonMessage(
        completedTasks,
        remainingTasks,
      );

      // Send the message via Telegram
      await this.telegramService.sendMessage(message);

      this.logger.log('Afternoon message sent successfully');
    } catch (error) {
      this.logger.error(`Failed to send afternoon message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handles the evening message command from Telegram
   * Fetches data, formats message, and sends it
   */
  async sendEveningMessage(): Promise<void> {
    try {
      // Fetch completed tasks for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      this.logger.debug(
        `Fetching completed tasks since: ${today.toISOString()}`,
      );
      const completedTasks =
        await this.todoistService.getCompletedTasksSince(today);
      this.logger.log(`Found ${completedTasks.length} completed tasks today`);

      // Log each completed task to help with debugging
      completedTasks.forEach((task) => {
        this.logger.debug(
          `Completed task: "${task.content}" on ${task.completedAt?.toISOString() || 'unknown'}`,
        );
      });

      // Fetch inbox tasks - ensure we're only getting actual inbox tasks without due dates
      const inboxTasks =
        await this.todoistService.getInboxTasksWithoutDueDates();
      this.logger.log(
        `Found ${inboxTasks.length} inbox tasks requiring triage`,
      );

      // Log each inbox task to help with debugging
      inboxTasks.forEach((task) => {
        this.logger.debug(`Inbox task: "${task.content}"`);
      });

      if (inboxTasks.length === 0 && completedTasks.length === 0) {
        this.logger.log(
          'No tasks to report in evening message - inbox is empty and no tasks completed',
        );
      }

      // Format the evening message with completed tasks and inbox tasks
      const message = await this.formatEveningMessage(
        completedTasks,
        inboxTasks,
      );

      // Send the message via Telegram
      await this.telegramService.sendMessage(message);

      this.logger.log('Evening message sent successfully');
    } catch (error) {
      this.logger.error(`Failed to send evening message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generates a motivational message based on completed tasks
   * @private
   */
  private async generateMotivationMessage(
    completedTasks: Task[],
  ): Promise<string> {
    if (completedTasks.length === 0) {
      return 'Keep going! The day is still young and you have time to make progress.';
    }

    try {
      // Create a list of completed tasks for the prompt
      const taskList = completedTasks.map((task) => task.content).join('\n');

      // Define the system prompt for the motivation message
      const systemPrompt = `
        You are a supportive productivity assistant.
        Based on the user's completed tasks, provide a single short sentence of encouragement 
        that acknowledges their progress today. Keep it brief, positive, and motivational.
        Do not add any additional formatting, just the motivational sentence.
      `;

      // Make the API request to OpenAI
      const response = await this.openaiClient.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Completed tasks: ${taskList}` },
        ],
        max_tokens: 50,
      });

      // Extract the response
      const content = response.choices[0].message.content;
      return content?.trim() || 'Great job on your progress today!';
    } catch (error) {
      this.logger.error(
        `Failed to generate motivation message: ${error.message}`,
      );
      return 'Well done on your progress today!';
    }
  }

  /**
   * Generates an evening reflection message based on completed tasks and inbox status
   * @private
   */
  private async generateEveningReflection(
    completedTasks: Task[],
    inboxTasks: Task[],
  ): Promise<string> {
    try {
      // Create context from completed tasks and inbox status
      const completedContext =
        completedTasks.length > 0
          ? `Completed tasks today: ${completedTasks.map((task) => task.content).join(', ')}`
          : 'No tasks completed today';

      const inboxContext =
        inboxTasks.length > 0
          ? `${inboxTasks.length} items in inbox requiring attention`
          : 'Inbox is clean and empty';

      // Define the system prompt for evening reflection
      const systemPrompt = `
        You are a wise and supportive productivity coach providing end-of-day reflection.
        Based on the user's daily accomplishments and inbox status, provide a single thoughtful sentence 
        that combines acknowledgment of their work with gentle guidance for tomorrow.
        Focus on progress, learning, and balanced productivity.
        Keep it brief, reflective, and encouraging. Do not add any additional formatting.
      `;

      // Make the API request to OpenAI
      const response = await this.openaiClient.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${completedContext}. ${inboxContext}.` },
        ],
        max_tokens: 60,
      });

      // Extract the response
      const content = response.choices[0].message.content;
      return (
        content?.trim() ||
        "Today's work is done - rest well and tomorrow brings new opportunities."
      );
    } catch (error) {
      this.logger.error(
        `Failed to generate evening reflection: ${error.message}`,
      );
      return "Reflect on today's progress and prepare your mind for tomorrow's possibilities.";
    }
  }

  /**
   * Generates a morning inspiration message based on today's tasks and calendar events
   * @private
   */
  private async generateMorningInspiration(
    dueTasks: Task[],
    calendarEvents: CalendarEvent[],
  ): Promise<string> {
    try {
      // Create context from today's tasks and calendar
      const tasksContext =
        dueTasks.length > 0
          ? `Today's tasks: ${dueTasks
              .map((task) => task.content)
              .slice(0, 5)
              .join(', ')}${dueTasks.length > 5 ? '...' : ''}`
          : 'No urgent tasks scheduled for today';

      const calendarContext =
        calendarEvents.length > 0
          ? `${calendarEvents.length} calendar events scheduled`
          : 'No calendar events today';

      // Count priority tasks for additional context
      const highPriorityCount = dueTasks.filter(
        (task) => task.priority >= 3,
      ).length;
      const priorityContext =
        highPriorityCount > 0
          ? ` including ${highPriorityCount} high-priority items`
          : '';

      // Define the system prompt for morning inspiration
      const systemPrompt = `
        You are an energizing and supportive productivity coach providing morning motivation.
        Based on the user's tasks and calendar for the day, provide a single inspiring sentence 
        that sets a positive, focused tone for the day ahead.
        Focus on opportunity, capability, and purposeful action.
        Keep it brief, energizing, and encouraging. Do not add any additional formatting.
      `;

      // Make the API request to OpenAI
      const response = await this.openaiClient.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `${tasksContext}. ${calendarContext}${priorityContext}.`,
          },
        ],
        max_tokens: 60,
      });

      // Extract the response
      const content = response.choices[0].message.content;
      return (
        content?.trim() ||
        'Today is full of possibilities - approach each task with intention and focus.'
      );
    } catch (error) {
      this.logger.error(
        `Failed to generate morning inspiration: ${error.message}`,
      );
      return 'Embrace the day ahead with confidence and purposeful energy.';
    }
  }
}
