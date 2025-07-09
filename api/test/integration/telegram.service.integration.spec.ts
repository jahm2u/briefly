import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TelegramService } from '../../lib/core/services/telegram.service';
import { ConfigService } from '../../lib/core/services/config.service';
import { Telegraf } from 'telegraf';
import { MockTelegraf } from '../mocks/telegraf.mock';

// Mock telegraf
jest.mock('telegraf');

describe('TelegramService Integration', () => {
  let telegramService: TelegramService;
  let mockTelegrafInstance: MockTelegraf;

  beforeEach(async () => {
    // First set up the Telegraf mock before creating the module
    mockTelegrafInstance = new MockTelegraf();

    // Ensure the mocked methods are properly setup
    mockTelegrafInstance.launch.mockImplementation(() => Promise.resolve());
    mockTelegrafInstance.stop.mockImplementation(() => Promise.resolve());
    mockTelegrafInstance.telegram.sendMessage.mockImplementation(() =>
      Promise.resolve(),
    );

    // Make sure the mock constructor returns our mock instance
    (Telegraf as unknown as jest.Mock).mockImplementation(
      () => mockTelegrafInstance,
    );

    // Create a testing module with actual ConfigService
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
        }),
      ],
      providers: [ConfigService, TelegramService],
    }).compile();

    telegramService = module.get<TelegramService>(TelegramService);
  });

  it('should be defined', () => {
    expect(telegramService).toBeDefined();
  });

  it('should initialize Telegraf with the correct bot token', () => {
    expect(Telegraf).toHaveBeenCalledWith('test-telegram-token');
  });

  describe('onModuleInit', () => {
    it('should launch the Telegram bot', async () => {
      await telegramService.onModuleInit();
      expect(mockTelegrafInstance.launch).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should stop the Telegram bot', async () => {
      await telegramService.onModuleDestroy();
      expect(mockTelegrafInstance.stop).toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    it('should send a message to the configured chat ID', async () => {
      const message = 'Test message';
      await telegramService.sendMessage(message);

      expect(mockTelegrafInstance.telegram.sendMessage).toHaveBeenCalledWith(
        '123456789', // From .env.test
        message,
        { parse_mode: 'Markdown' },
      );
    });
  });

  describe('sendMorningMessage', () => {
    it('should format and send a morning message', async () => {
      // Mock the sendMessage method
      jest.spyOn(telegramService, 'sendMessage').mockResolvedValue();

      const calendarEvents = [
        '09:00–09:30 | Team Daily Standup',
        '14:00–15:00 | Strategic Roadmap Discussion',
      ];
      const newTasks = ['Review updated pricing strategy proposal [View Task]'];
      const groupedTasks = {
        Product: ['Evaluate latest UX feedback from users [View Task]'],
        Operational: ['Follow up on billing discrepancy issue [View Task]'],
      };

      await telegramService.sendMorningMessage(
        calendarEvents,
        newTasks,
        groupedTasks,
      );

      expect(telegramService.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Good morning!'),
      );
      expect(telegramService.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Calendar Events:'),
      );
      expect(telegramService.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Team Daily Standup'),
      );
      expect(telegramService.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('New Tasks (since yesterday):'),
      );
      expect(telegramService.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Review updated pricing strategy proposal'),
      );
      expect(telegramService.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Grouped Tasks:'),
      );
      expect(telegramService.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Product:'),
      );
      expect(telegramService.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Evaluate latest UX feedback'),
      );
    });
  });

  describe('sendAfternoonMessage', () => {
    it('should format and send an afternoon message', async () => {
      // Mock the sendMessage method
      jest.spyOn(telegramService, 'sendMessage').mockResolvedValue();

      const completedTasks = ['Complete presentation for tomorrow [View Task]'];
      const newInboxTasks = ['Review client feedback [View Task]'];
      const groupedTasks = {
        Priority: ['Finalize quarterly report [View Task]'],
        Communication: ['Follow up with marketing team [View Task]'],
      };

      await telegramService.sendAfternoonMessage(
        completedTasks,
        newInboxTasks,
        groupedTasks,
      );

      expect(telegramService.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Afternoon update!'),
      );
      expect(telegramService.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Completed since morning:'),
      );
      expect(telegramService.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Complete presentation for tomorrow'),
      );
    });
  });
});
