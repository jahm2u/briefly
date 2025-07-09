import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '../../../lib/core/services/config.service';
import { ConfigModule } from '@nestjs/config';
import { ConfigException } from '../../../lib/core/exceptions/config.exception';

describe('ConfigService', () => {
  let service: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
          isGlobal: true,
        }),
      ],
      providers: [ConfigService],
    }).compile();

    service = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRequired', () => {
    it('should return the value when it exists', () => {
      // Mock the internal config get method
      jest.spyOn(service as any, 'get').mockReturnValue('test-value');

      expect(service.getRequired('TEST_KEY')).toBe('test-value');
    });

    it('should throw ConfigException when required key is missing', () => {
      // Mock the internal config get method to return undefined
      jest.spyOn(service as any, 'get').mockReturnValue(undefined);

      expect(() => service.getRequired('MISSING_KEY')).toThrow(ConfigException);
      expect(() => service.getRequired('MISSING_KEY')).toThrow(
        'Required configuration MISSING_KEY is missing',
      );
    });
  });

  describe('get', () => {
    it('should return the value when it exists', () => {
      // Mock the process.env directly for this test
      process.env.TEST_KEY = 'test-value';

      expect(service.get('TEST_KEY')).toBe('test-value');

      // Clean up
      delete process.env.TEST_KEY;
    });

    it('should return undefined when key is missing', () => {
      expect(service.get('NONEXISTENT_KEY')).toBeUndefined();
    });

    it('should return default value when key is missing and default is provided', () => {
      expect(service.get('NONEXISTENT_KEY', 'default-value')).toBe(
        'default-value',
      );
    });
  });

  describe('getTodoistApiToken', () => {
    it('should return the Todoist API token', () => {
      jest.spyOn(service, 'getRequired').mockReturnValue('todoist-api-token');

      expect(service.getTodoistApiToken()).toBe('todoist-api-token');
      expect(service.getRequired).toHaveBeenCalledWith('TODOIST_API_TOKEN');
    });
  });

  describe('getTelegramBotToken', () => {
    it('should return the Telegram Bot token', () => {
      jest.spyOn(service, 'getRequired').mockReturnValue('telegram-bot-token');

      expect(service.getTelegramBotToken()).toBe('telegram-bot-token');
      expect(service.getRequired).toHaveBeenCalledWith('TELEGRAM_BOT_TOKEN');
    });
  });

  describe('getOpenAiApiKey', () => {
    it('should return the OpenAI API key', () => {
      jest.spyOn(service, 'getRequired').mockReturnValue('openai-api-key');

      expect(service.getOpenAiApiKey()).toBe('openai-api-key');
      expect(service.getRequired).toHaveBeenCalledWith('OPENAI_API_KEY');
    });
  });

  describe('getEncryptionKey', () => {
    it('should return the encryption key', () => {
      jest
        .spyOn(service, 'getRequired')
        .mockReturnValue('32-char-encryption-key-for-aes-256');

      expect(service.getEncryptionKey()).toBe(
        '32-char-encryption-key-for-aes-256',
      );
      expect(service.getRequired).toHaveBeenCalledWith('ENCRYPTION_KEY');
    });
  });

  describe('getTelegramChatId', () => {
    it('should return the Telegram chat ID', () => {
      jest.spyOn(service, 'getRequired').mockReturnValue('123456789');

      expect(service.getTelegramChatId()).toBe('123456789');
      expect(service.getRequired).toHaveBeenCalledWith('TELEGRAM_CHAT_ID');
    });
  });

  describe('getICalUrls', () => {
    it('should return array of iCal URLs from comma-separated string', () => {
      jest
        .spyOn(service, 'getRequired')
        .mockReturnValue('https://cal1.com/cal.ics,https://cal2.com/cal.ics');

      expect(service.getICalUrls()).toEqual([
        'https://cal1.com/cal.ics',
        'https://cal2.com/cal.ics',
      ]);
      expect(service.getRequired).toHaveBeenCalledWith('ICAL_URLS');
    });

    it('should handle a single URL', () => {
      jest
        .spyOn(service, 'getRequired')
        .mockReturnValue('https://cal1.com/cal.ics');

      expect(service.getICalUrls()).toEqual(['https://cal1.com/cal.ics']);
    });
  });

  describe('getEnvironment', () => {
    it('should return the environment', () => {
      jest.spyOn(service, 'get').mockReturnValue('development');

      expect(service.getEnvironment()).toBe('development');
      expect(service.get).toHaveBeenCalledWith('ENVIRONMENT', 'development');
    });

    it('should return default environment when not set', () => {
      jest.spyOn(service, 'get').mockReturnValue('development');

      expect(service.getEnvironment()).toBe('development');
    });
  });

  describe('isDevelopment', () => {
    it('should return true when environment is development', () => {
      jest.spyOn(service, 'getEnvironment').mockReturnValue('development');

      expect(service.isDevelopment()).toBe(true);
    });

    it('should return false when environment is not development', () => {
      jest.spyOn(service, 'getEnvironment').mockReturnValue('production');

      expect(service.isDevelopment()).toBe(false);
    });
  });
});
