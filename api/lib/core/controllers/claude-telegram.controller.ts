import { Controller, Post, Body, Logger } from '@nestjs/common';
import { TelegramService } from '../services/telegram.service';
import { ClaudeCommandSelectorService } from '../../logic/claude/claude-command-selector.service';
import { ClaudeCliService } from '../../logic/claude/claude-cli.service';

interface TelegramWebhookMessage {
  message?: {
    chat: {
      id: number;
      type: string;
    };
    from: {
      id: number;
      username?: string;
      first_name: string;
    };
    text: string;
    message_id: number;
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      username?: string;
    };
    message: {
      message_id: number;
      chat: {
        id: number;
      };
    };
    data: string;
  };
}

@Controller('api/claude-telegram')
export class ClaudeTelegramController {
  private readonly logger = new Logger(ClaudeTelegramController.name);
  private readonly conversationHistory = new Map<number, string[]>();
  private readonly pendingConfirmations = new Map<number, any>();

  constructor(
    private telegramService: TelegramService,
    private commandSelector: ClaudeCommandSelectorService,
    private claudeCliService: ClaudeCliService,
  ) {}

  @Post('webhook')
  async handleWebhook(@Body() body: TelegramWebhookMessage) {
    try {
      // Handle regular messages
      if (body.message) {
        await this.handleMessage(body.message);
      }

      // Handle callback queries (inline keyboard responses)
      if (body.callback_query) {
        await this.handleCallbackQuery(body.callback_query);
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Error processing Telegram webhook:', error);
      return { success: false, error: error.message };
    }
  }

  private async handleMessage(message: any) {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const text = message.text;

    // Check if message starts with /claude command
    if (!text.startsWith('/claude ')) {
      return;
    }

    // Extract the actual request
    const request = text.substring(8).trim();

    if (!request) {
      await this.telegramService.sendMessageToChat(
        chatId,
        '❓ Please provide a request after /claude command.\n\nExample: /claude add user authentication feature',
      );
      return;
    }

    try {
      // Send "thinking" message
      await this.telegramService.sendMessageToChat(
        chatId,
        '🤖 Analyzing your request...',
      );

      // Select appropriate command
      const selection = await this.commandSelector.selectCommand(request);

      this.logger.log(
        `Command selected: ${selection.command} (${selection.confidence}% confidence)`,
      );

      // Send selection confirmation
      await this.telegramService.sendMessageToChat(
        chatId,
        `🎯 **Command Selected**: ${selection.command.toUpperCase()}\n` +
          `💭 **Reasoning**: ${selection.reasoning}\n` +
          `⚡ **Confidence**: ${selection.confidence}%\n\n` +
          `🔄 Processing your request...`,
      );

      // Get conversation history
      const history = this.conversationHistory.get(chatId) || [];

      // Execute the command
      const response = await this.claudeCliService.executeCommand(
        selection,
        selection.extractedRequest,
        history,
      );

      // Update conversation history
      history.push(`User: ${request}`);
      history.push(`Claude: ${response.message}`);
      this.conversationHistory.set(chatId, history.slice(-10)); // Keep last 10 messages

      // Send response based on type
      await this.sendClaudeResponse(chatId, response);
    } catch (error) {
      this.logger.error('Error processing Claude request:', error);
      await this.telegramService.sendMessageToChat(
        chatId,
        `❌ **Error**: ${error.message}\n\nPlease try again or contact support.`,
      );
    }
  }

  private async handleCallbackQuery(callbackQuery: any) {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;

    // Handle confirmation responses
    if (data.startsWith('confirm_')) {
      const action = data.substring(8); // Remove 'confirm_' prefix
      const confirm = action === 'yes';

      const context = this.pendingConfirmations.get(chatId);
      if (context) {
        this.pendingConfirmations.delete(chatId);

        const response = await this.claudeCliService.sendConfirmation(
          confirm,
          context,
        );
        await this.sendClaudeResponse(chatId, response);
      }
    }

    // Answer the callback query to remove loading state
    await this.telegramService.answerCallbackQuery(callbackQuery.id);
  }

  private async sendClaudeResponse(chatId: number, response: any) {
    let message = '';
    let keyboard: any = null;

    switch (response.type) {
      case 'confirmation':
        message = `⚠️ **Confirmation Required**\n\n${response.message}`;
        keyboard = {
          inline_keyboard: [
            [
              { text: '✅ Yes', callback_data: 'confirm_yes' },
              { text: '❌ No', callback_data: 'confirm_no' },
            ],
          ],
        };
        // Store context for confirmation
        this.pendingConfirmations.set(chatId, response.metadata);
        break;

      case 'success':
        message = `✅ **Success**\n\n${response.message}`;
        if (response.metadata?.pr) {
          message += `\n\n🔗 **Pull Request**: ${response.metadata.pr}`;
        }
        if (response.metadata?.branch) {
          message += `\n🌿 **Branch**: ${response.metadata.branch}`;
        }
        break;

      case 'error':
        message = `❌ **Error**\n\n${response.message}`;
        break;

      case 'information':
      default:
        message = `ℹ️ **Update**\n\n${response.message}`;
        break;
    }

    await this.telegramService.sendMessageToChat(chatId, message, keyboard);
  }
}
