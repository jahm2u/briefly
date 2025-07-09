import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { ConfigException } from '../exceptions/config.exception';

/**
 * Service for securely managing configuration and API keys
 */
@Injectable()
export class ConfigService {
  constructor(private readonly configService: NestConfigService) {}

  /**
   * Gets a required configuration value, throwing an exception if it's missing
   */
  getRequired(key: string): string {
    const value = this.get(key);
    if (value === undefined) {
      throw new ConfigException(`Required configuration ${key} is missing`);
    }
    return value;
  }

  /**
   * Gets a configuration value with an optional default
   */
  get(key: string, defaultValue?: string): string | undefined {
    return this.configService.get<string>(key) ?? defaultValue;
  }

  /**
   * Gets the Todoist API token
   */
  getTodoistApiToken(): string {
    return this.getRequired('TODOIST_API_TOKEN');
  }

  /**
   * Gets the Telegram Bot token
   */
  getTelegramBotToken(): string {
    return this.getRequired('TELEGRAM_BOT_TOKEN');
  }

  /**
   * Gets the OpenAI API key
   */
  getOpenAiApiKey(): string {
    return this.getRequired('OPENAI_API_KEY');
  }

  /**
   * Gets the encryption key for sensitive data
   */
  getEncryptionKey(): string {
    return this.getRequired('ENCRYPTION_KEY');
  }

  /**
   * Gets the Telegram chat ID for sending messages
   */
  getTelegramChatId(): string {
    return this.getRequired('TELEGRAM_CHAT_ID');
  }

  /**
   * Gets the array of iCal URLs from comma-separated string
   */
  getICalUrls(): string[] {
    const urlsString = this.getRequired('ICAL_URLS');
    return urlsString.split(',').map((url) => url.trim());
  }

  /**
   * Gets the current environment
   */
  getEnvironment(): string {
    // We know this will always return a string because we provide a default value
    return this.get('ENVIRONMENT', 'development') as string;
  }

  /**
   * Checks if the current environment is development
   */
  isDevelopment(): boolean {
    return this.getEnvironment() === 'development';
  }
}
