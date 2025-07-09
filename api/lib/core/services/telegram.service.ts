import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as TelegramBot from 'node-telegram-bot-api';
import { ConfigService } from './config.service';

/**
 * Service for interacting with the Telegram Bot API using node-telegram-bot-api
 * This implementation provides more reliable startup messages and command handling
 */
@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly bot: TelegramBot;
  private messagingService: any; // Will be injected later by MessagingModule
  private claudeCliService: any; // Will be injected later by MessagingModule
  private readonly conversationHistory = new Map<number, string[]>();
  private readonly pendingConfirmations = new Map<number, any>();

  constructor(private readonly configService: ConfigService) {
    // Initialize the bot with the token from config
    const token = this.configService.getTelegramBotToken();

    // Create bot with polling enabled to receive messages
    this.bot = new TelegramBot(token, {
      polling: true,
      // Only enable polling in production or with valid credentials
      // Will be checked in onModuleInit
    });
  }

  /**
   * Lifecycle hook to start the bot when the module initializes
   */
  async onModuleInit(): Promise<void> {
    try {
      const isDevelopment =
        this.configService.getEnvironment() === 'development';

      // Check if we have valid Telegram credentials
      const hasCredentials =
        this.configService.getTelegramBotToken() &&
        this.configService.getTelegramChatId() &&
        this.configService.getTelegramBotToken() !==
          'your_telegram_bot_token_here' &&
        this.configService.getTelegramChatId() !== 'your_telegram_chat_id_here';

      if (!isDevelopment || hasCredentials) {
        // Set up command handlers before launching
        this.setupCommandHandlers();

        // Bot is already started with polling in constructor
        console.log('✅ Telegram bot launched successfully!');

        // Send introduction message
        await this.sendIntroductionMessage();
      } else {
        console.log(
          '🟡 Running in development mode without valid Telegram credentials - Messages will be logged to console.',
        );
        console.log(
          '💡 To enable Telegram in development, set ENVIRONMENT=production or add valid TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to .env',
        );

        // Stop polling in development mode without credentials
        this.bot.stopPolling();
      }
    } catch (error) {
      console.warn('❌ Failed to launch Telegram bot:', error.message);
      console.log(
        '🟡 Continuing in development mode - Messages will be logged to console.',
      );
    }
  }

  /**
   * Lifecycle hook to gracefully stop the bot when the module is destroyed
   */
  async onModuleDestroy(): Promise<void> {
    this.bot.stopPolling();
  }

  /**
   * Sets up command handlers for the Telegram bot
   */
  private setupCommandHandlers(): void {
    // Command handler for /start
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      await this.bot.sendMessage(
        chatId,
        "Welcome to Briefly! I'll help you manage your tasks and calendar. " +
          "I'll send you daily updates at 7am, after your last meeting, and at 8pm.\n\n" +
          'You can also trigger updates manually with these commands:\n' +
          '/morning - Morning overview with calendar events and tasks\n' +
          '/afternoon - Afternoon update with completed and remaining tasks\n' +
          '/evening - Evening reminder with inbox tasks to triage',
        { parse_mode: 'Markdown' },
      );
    });

    // Command handler for /help
    this.bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id;
      await this.bot.sendMessage(
        chatId,
        '**Briefly Bot Commands**\n\n' +
          '/start - Introduce the bot and its features\n' +
          '/help - Show this help message\n' +
          '/morning - Trigger the morning message\n' +
          '/afternoon - Trigger the afternoon message\n' +
          '/evening - Trigger the evening message',
        { parse_mode: 'Markdown' },
      );
    });

    // Command handler for /morning
    this.bot.onText(/\/morning/, async (msg) => {
      const chatId = msg.chat.id;
      if (!this.messagingService) {
        await this.bot.sendMessage(
          chatId,
          'The messaging service is still initializing. Please try again in a moment.',
        );
        return;
      }

      await this.bot.sendMessage(chatId, 'Generating your morning overview...');
      try {
        // Call the messaging service to generate and send the morning message
        await this.messagingService.sendMorningMessage();
        // No need to reply again as the message is already sent by the service
      } catch (error) {
        await this.bot.sendMessage(
          chatId,
          `Error generating morning message: ${error.message}`,
        );
      }
    });

    // Command handler for /afternoon
    this.bot.onText(/\/afternoon/, async (msg) => {
      const chatId = msg.chat.id;
      if (!this.messagingService) {
        await this.bot.sendMessage(
          chatId,
          'The messaging service is still initializing. Please try again in a moment.',
        );
        return;
      }

      await this.bot.sendMessage(chatId, 'Generating your afternoon update...');
      try {
        // Call the messaging service to generate and send the afternoon message
        await this.messagingService.sendAfternoonMessage();
      } catch (error) {
        await this.bot.sendMessage(
          chatId,
          `Error generating afternoon message: ${error.message}`,
        );
      }
    });

    // Command handler for /evening
    this.bot.onText(/\/evening/, async (msg) => {
      const chatId = msg.chat.id;
      if (!this.messagingService) {
        await this.bot.sendMessage(
          chatId,
          'The messaging service is still initializing. Please try again in a moment.',
        );
        return;
      }

      await this.bot.sendMessage(chatId, 'Generating your evening reminder...');
      try {
        // Call the messaging service to generate and send the evening message
        await this.messagingService.sendEveningMessage();
      } catch (error) {
        await this.bot.sendMessage(
          chatId,
          `Error generating evening message: ${error.message}`,
        );
      }
    });

    // Command handler for /claude
    this.bot.onText(/\/claude (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const request = match?.[1]?.trim();

      console.log(`[Claude] Received command from chat ${chatId}: ${request}`);

      if (!request) {
        await this.bot.sendMessage(
          chatId,
          '❓ Please provide a request after /claude command.\n\nExample: /claude add user authentication feature'
        );
        return;
      }

      if (!this.claudeCliService) {
        await this.bot.sendMessage(
          chatId,
          'Claude services are still initializing. Please try again in a moment.'
        );
        return;
      }

      try {
        // Send processing message
        console.log(`[Claude] Processing request: ${request}`);
        await this.bot.sendMessage(chatId, '🤖 Processing your request...');

        // Execute the command directly
        const response = await this.claudeCliService.executeCommand(request);

        console.log(`[Claude] Command execution result: ${response.type}`);

        // Update conversation history
        const history = this.conversationHistory.get(chatId) || [];
        history.push(`User: ${request}`);
        history.push(`Claude: ${response.message}`);
        this.conversationHistory.set(chatId, history.slice(-10)); // Keep last 10 messages

        // Send response based on type
        await this.sendClaudeResponse(chatId, response);

      } catch (error) {
        console.error('[Claude] Error processing request:', error);
        await this.bot.sendMessage(
          chatId,
          `❌ **Error**: ${error.message}\n\nPlease try again or contact support.`,
          { parse_mode: 'Markdown' }
        );
      }
    });

    // Handle callback queries for Claude confirmations
    this.bot.on('callback_query', async (callbackQuery) => {
      const chatId = callbackQuery.message?.chat.id;
      const data = callbackQuery.data;

      if (!chatId || !data) return;

      console.log(`[Claude] Callback query from chat ${chatId}: ${data}`);

      // Handle confirmation responses
      if (data.startsWith('confirm_')) {
        const action = data.substring(8); // Remove 'confirm_' prefix
        const confirm = action === 'yes';
        
        const context = this.pendingConfirmations.get(chatId);
        if (context) {
          this.pendingConfirmations.delete(chatId);
          
          console.log(`[Claude] Processing confirmation: ${confirm ? 'yes' : 'no'}`);
          
          const response = await this.claudeCliService.sendConfirmation(confirm, context);
          await this.sendClaudeResponse(chatId, response);
        }
      }

      // Answer the callback query to remove loading state
      await this.bot.answerCallbackQuery(callbackQuery.id);
    });
  }

  /**
   * Sets the messaging service reference - called by MessagingModule
   */
  setMessagingService(service: any): void {
    this.messagingService = service;
  }

  /**
   * Sets the Claude services references - called by MessagingModule
   */
  setClaudeServices(cliService: any): void {
    this.claudeCliService = cliService;
  }

  /**
   * Sends a Claude response with appropriate formatting and keyboard
   */
  private async sendClaudeResponse(chatId: number, response: any): Promise<void> {
    let message = '';
    let keyboard: any = null;

    // Helper function to escape Markdown special characters
    const escapeMarkdown = (text: string): string => {
      return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
    };

    switch (response.type) {
      case 'confirmation':
        message = `⚠️ **Confirmation Required**\n\n${escapeMarkdown(response.message)}`;
        keyboard = {
          inline_keyboard: [
            [
              { text: '✅ Yes', callback_data: 'confirm_yes' },
              { text: '❌ No', callback_data: 'confirm_no' }
            ]
          ]
        };
        // Store context for confirmation
        this.pendingConfirmations.set(chatId, response.metadata);
        break;

      case 'success':
        message = `✅ **Success**\n\n${escapeMarkdown(response.message)}`;
        if (response.metadata?.pr) {
          message += `\n\n🔗 **Pull Request**: ${response.metadata.pr}`;
        }
        if (response.metadata?.branch) {
          message += `\n🌿 **Branch**: ${response.metadata.branch}`;
        }
        break;

      case 'error':
        message = `❌ **Error**\n\n${escapeMarkdown(response.message)}`;
        break;

      case 'information':
      default:
        message = `ℹ️ **Update**\n\n${escapeMarkdown(response.message)}`;
        break;
    }

    const messageOptions: any = {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    };

    if (keyboard) {
      messageOptions.reply_markup = keyboard;
    }

    try {
      await this.bot.sendMessage(chatId, message, messageOptions);
    } catch (error) {
      console.error('[Claude] Telegram send error:', error);
      // Fallback: send without markdown formatting
      try {
        await this.bot.sendMessage(chatId, message.replace(/\*\*/g, ''), {
          disable_web_page_preview: true,
        });
      } catch (fallbackError) {
        console.error('[Claude] Fallback send failed:', fallbackError);
      }
    }
  }

  /**
   * Splits a long message into smaller chunks that fit within Telegram's character limit
   * while preserving Markdown formatting and logical breaks
   */
  private splitMessageIntoChunks(message: string, maxLength: number): string[] {
    const chunks: string[] = [];
    let currentChunk = '';

    // Split by double newlines (paragraphs/sections) first
    const sections = message.split('\n\n');

    for (const section of sections) {
      // If adding this section would exceed the limit, save current chunk and start new one
      if (
        currentChunk.length + section.length + 2 > maxLength &&
        currentChunk.length > 0
      ) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }

      // If a single section is too long, split it by single newlines
      if (section.length > maxLength) {
        const lines = section.split('\n');
        for (const line of lines) {
          if (
            currentChunk.length + line.length + 1 > maxLength &&
            currentChunk.length > 0
          ) {
            chunks.push(currentChunk.trim());
            currentChunk = '';
          }

          // If a single line is still too long, force split it
          if (line.length > maxLength) {
            if (currentChunk.length > 0) {
              chunks.push(currentChunk.trim());
              currentChunk = '';
            }

            // Split long line into smaller pieces
            for (let i = 0; i < line.length; i += maxLength) {
              chunks.push(line.substring(i, i + maxLength));
            }
          } else {
            currentChunk += (currentChunk.length > 0 ? '\n' : '') + line;
          }
        }
      } else {
        currentChunk += (currentChunk.length > 0 ? '\n\n' : '') + section;
      }
    }

    // Add the last chunk if it has content
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    // If we somehow ended up with empty chunks, return the original message as one chunk
    if (chunks.length === 0) {
      chunks.push(message);
    }

    return chunks;
  }

  /**
   * Sends an introduction message when the bot starts
   */
  private async sendIntroductionMessage(): Promise<void> {
    try {
      const chatId = this.configService.getTelegramChatId();
      const isDevelopment =
        this.configService.getEnvironment() === 'development';

      // Check if we have valid Telegram credentials
      const hasCredentials =
        this.configService.getTelegramBotToken() &&
        this.configService.getTelegramChatId() &&
        this.configService.getTelegramBotToken() !==
          'your_telegram_bot_token_here' &&
        this.configService.getTelegramChatId() !== 'your_telegram_chat_id_here';

      // Skip sending in development mode without credentials
      if (isDevelopment && !hasCredentials) {
        console.log('\n=== TELEGRAM INTRODUCTION (CONSOLE ONLY) ===');
        console.log(
          'Bot started and ready to use. Available commands:\n/morning - Morning overview\n/afternoon - Afternoon update\n/evening - Evening reminder',
        );
        console.log('=====================================\n');
        return;
      }

      // Send actual introduction - with more reliable delivery using node-telegram-bot-api
      const message =
        '🤖 **Briefly Bot Started**\n\n' +
        "I'm now active and ready to help you manage your tasks and calendar. " +
        "I'll send you three daily updates:\n\n" +
        '☀️ **Morning (7am)**: Overview of calendar events and tasks\n' +
        '🌤️ **Afternoon (after final meeting)**: Update on completed tasks\n' +
        '🌙 **Evening (8pm)**: Reminder for inbox triage\n\n' +
        'You can also trigger these updates manually with:\n' +
        '/morning - Morning overview\n' +
        '/afternoon - Afternoon update\n' +
        '/evening - Evening reminder';

      // Send directly to the configured chat ID for more reliability
      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
      });
      console.log('✅ Telegram introduction message sent successfully!');
    } catch (error) {
      console.warn(
        `❌ Failed to send Telegram introduction message: ${error.message}`,
      );
      // Don't throw error, just log warning
    }
  }

  /**
   * Sends a message to the configured Telegram chat
   */
  public async sendMessage(message: string): Promise<void> {
    try {
      // Get the chat ID from config
      const chatId = this.configService.getTelegramChatId();

      // Check if in development mode without valid credentials, then just log instead
      const isDevelopment =
        this.configService.getEnvironment() === 'development';
      const hasCredentials =
        chatId && String(chatId) !== 'your_telegram_chat_id_here';

      if (isDevelopment && !hasCredentials) {
        console.log('📤 Telegram message (development mode):');
        console.log(message);
        return;
      }

      // Common message options with disabled web page preview to prevent link unfurling
      const messageOptions = {
        parse_mode: 'Markdown' as TelegramBot.ParseMode,
        disable_web_page_preview: true, // Prevent links from unfurling
      };

      // Split long messages if needed (Telegram has a 4096 character limit per message)
      const chunks = this.splitMessageIntoChunks(message, 4000); // Leave some margin for safety

      if (chunks.length > 1) {
        for (let i = 0; i < chunks.length; i++) {
          await this.bot.sendMessage(chatId, chunks[i], messageOptions);

          // Add small delay between multiple message chunks
          if (i < chunks.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
      } else {
        await this.bot.sendMessage(chatId, message, messageOptions);
      }
    } catch (error) {
      console.warn(`❌ Failed to send Telegram message: ${error.message}`);
      throw error; // Re-throw to allow retry logic
    }
  }

  /**
   * Sends a message to a specific chat ID with optional keyboard
   */
  public async sendMessageToChat(
    chatId: number,
    message: string,
    keyboard?: any,
  ): Promise<void> {
    try {
      const messageText = message;

      // Check if in development mode without valid credentials, then just log instead
      const isDevelopment =
        this.configService.getEnvironment() === 'development';
      const hasCredentials =
        chatId && String(chatId) !== 'your_telegram_chat_id_here';

      if (isDevelopment && !hasCredentials) {
        console.log('📤 Telegram message (development mode):');
        console.log(messageText);
        if (keyboard) {
          console.log('📱 Keyboard:', JSON.stringify(keyboard, null, 2));
        }
        return;
      }

      // Common message options with disabled web page preview to prevent link unfurling
      const messageOptions: any = {
        parse_mode: 'Markdown' as TelegramBot.ParseMode,
        disable_web_page_preview: true, // Prevent links from unfurling
      };

      // Add keyboard if provided
      if (keyboard) {
        messageOptions.reply_markup = keyboard;
      }

      // Split long messages if needed (Telegram has a 4096 character limit per message)
      const chunks = this.splitMessageIntoChunks(messageText, 4000); // Leave some margin for safety

      if (chunks.length > 1) {
        for (let i = 0; i < chunks.length; i++) {
          // Only add keyboard to the last chunk
          const chunkOptions =
            i === chunks.length - 1
              ? messageOptions
              : {
                  parse_mode: 'Markdown' as TelegramBot.ParseMode,
                  disable_web_page_preview: true,
                };

          await this.bot.sendMessage(chatId, chunks[i], chunkOptions);

          // Add small delay between multiple message chunks
          if (i < chunks.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
      } else {
        await this.bot.sendMessage(chatId, messageText, messageOptions);
      }
    } catch (error) {
      console.warn(`❌ Failed to send Telegram message: ${error.message}`);
      throw error; // Re-throw to allow retry logic
    }
  }

  /**
   * Answers a callback query from an inline keyboard
   */
  public async answerCallbackQuery(
    callbackQueryId: string,
    text?: string,
  ): Promise<void> {
    try {
      await this.bot.answerCallbackQuery(callbackQueryId, {
        text: text || 'Processing...',
      });
    } catch (error) {
      console.warn(`❌ Failed to answer callback query: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sends a message to the configured Telegram chat
   */
  async sendMorningMessage(
    calendarEvents: string[],
    newTasks: string[],
    groupedTasks: Record<string, string[]>,
  ): Promise<void> {
    // Format the message according to the template
    let message = "☀️ **Good morning! Here's today's overview:**\n\n";

    // Calendar events section
    message += '📅 **Calendar Events:**\n';
    if (calendarEvents.length === 0) {
      message += '- No calendar events for today\n';
    } else {
      calendarEvents.forEach((event) => {
        message += `- ${event}\n`;
      });
    }
    message += '\n';

    // New tasks section
    message += '✨ **New Tasks (since yesterday):**\n';
    if (newTasks.length === 0) {
      message += '- No new tasks since yesterday\n';
    } else {
      newTasks.forEach((task) => {
        message += `- ${task}\n`;
      });
    }
    message += '\n';

    // Grouped tasks section
    message += '🗂 **Grouped Tasks:**\n';
    if (Object.keys(groupedTasks).length === 0) {
      message += '- No tasks to display\n';
    } else {
      for (const [category, tasks] of Object.entries(groupedTasks)) {
        message += `**${category}:**\n`;
        tasks.forEach((task) => {
          message += `- ${task}\n`;
        });
        message += '\n';
      }
    }

    await this.sendMessage(message);
  }

  /**
   * Formats and sends the afternoon message
   */
  async sendAfternoonMessage(
    completedTasks: string[],
    newInboxTasks: string[],
    groupedTasks: Record<string, string[]>,
    motivationMessage = '',
  ): Promise<void> {
    // Format the message according to the template
    let message = '🌤️ **Afternoon update!**\n\n';

    // Completed tasks section
    message += '✅ **Completed since morning:**\n';
    if (completedTasks.length === 0) {
      message += '- No tasks completed since morning\n';
    } else {
      completedTasks.forEach((task) => {
        message += `- ${task}\n`;
      });
    }
    message += '\n';

    // New inbox tasks section
    message += '📥 **New inbox tasks:**\n';
    if (newInboxTasks.length === 0) {
      message += '- No new inbox tasks\n';
    } else {
      newInboxTasks.forEach((task) => {
        message += `- ${task}\n`;
      });
    }
    message += '\n';

    // Remaining tasks section
    message += '📋 **Remaining tasks:**\n';
    if (Object.keys(groupedTasks).length === 0) {
      message += '- No remaining tasks\n';
    } else {
      for (const [category, tasks] of Object.entries(groupedTasks)) {
        message += `**${category}:**\n`;
        tasks.forEach((task) => {
          message += `- ${task}\n`;
        });
        message += '\n';
      }
    }

    // Add motivation message if provided
    if (motivationMessage) {
      message += `💫 **${motivationMessage}**\n`;
    }

    await this.sendMessage(message);
  }

  /**
   * Formats and sends the evening message
   */
  async sendEveningMessage(
    groupedInboxTasks: Record<string, string[]>,
  ): Promise<void> {
    // Format the message according to the template
    let message = '🌙 **Evening reminder**\n\n';

    // Inbox tasks section
    message += '📥 **Inbox tasks to triage:**\n';
    if (Object.keys(groupedInboxTasks).length === 0) {
      message += '- No inbox tasks require attention\n';
    } else {
      for (const [category, tasks] of Object.entries(groupedInboxTasks)) {
        message += `**${category}:**\n`;
        tasks.forEach((task) => {
          message += `- ${task}\n`;
        });
        message += '\n';
      }
    }

    await this.sendMessage(message);
  }
}
