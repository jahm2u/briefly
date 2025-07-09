import { Test, TestingModule } from '@nestjs/testing';
import { TelegramService } from '../../../lib/core/services/telegram.service';
import { ConfigService } from '../../../lib/core/services/config.service';
import { Telegraf } from 'telegraf';

// Mock Telegraf
jest.mock('telegraf');

describe('TelegramService', () => {
  let service: TelegramService;
  let configService: ConfigService;
  let mockSendMessage: jest.Mock;
  let mockLaunch: jest.Mock;
  let mockStop: jest.Mock;

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create a mock for ConfigService
    const configServiceMock = {
      getTelegramBotToken: jest.fn().mockReturnValue('mock-telegram-token'),
      getTelegramChatId: jest.fn().mockReturnValue('123456789'),
      getEnvironment: jest.fn().mockReturnValue('production'),
    };

    // Set up Telegraf mock
    mockSendMessage = jest.fn().mockResolvedValue({});
    mockLaunch = jest.fn();
    mockStop = jest.fn();

    const telegrafMock = {
      telegram: {
        sendMessage: mockSendMessage,
      },
      launch: mockLaunch,
      stop: mockStop,
    };

    (Telegraf as unknown as jest.Mock).mockImplementation(() => telegrafMock);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramService,
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = module.get<TelegramService>(TelegramService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize Telegraf with token from ConfigService', () => {
    expect(configService.getTelegramBotToken).toHaveBeenCalled();
    expect(Telegraf).toHaveBeenCalledWith('mock-telegram-token');
  });

  describe('onModuleInit', () => {
    it('should launch the Telegram bot', async () => {
      await service.onModuleInit();
      expect(mockLaunch).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should stop the Telegram bot', async () => {
      await service.onModuleDestroy();
      expect(mockStop).toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    it('should send a message to the configured chat ID', async () => {
      const message = 'Test message';
      await service.sendMessage(message);

      expect(configService.getTelegramChatId).toHaveBeenCalled();
      expect(mockSendMessage).toHaveBeenCalledWith('123456789', message, {
        parse_mode: 'Markdown',
      });
    });

    it('should handle errors when sending messages', async () => {
      const message = 'Test message';
      const error = new Error('Failed to send message');
      mockSendMessage.mockRejectedValue(error);

      await expect(service.sendMessage(message)).rejects.toThrow(
        'Failed to send Telegram message: Failed to send message',
      );
    });
  });

  describe('sendMorningMessage', () => {
    it('should format and send a morning message', async () => {
      // Mock the sendMessage method
      jest.spyOn(service, 'sendMessage').mockResolvedValue();

      const calendarEvents = [
        '09:00–09:30 | Team Daily Standup',
        '14:00–15:00 | Strategic Roadmap Discussion',
      ];
      const newTasks = ['Review updated pricing strategy proposal [View Task]'];
      const groupedTasks = {
        Product: ['Evaluate latest UX feedback from users [View Task]'],
        Operational: ['Follow up on billing discrepancy issue [View Task]'],
      };

      await service.sendMorningMessage(calendarEvents, newTasks, groupedTasks);

      expect(service.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Good morning!'),
      );
      expect(service.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Calendar Events:'),
      );
      expect(service.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Team Daily Standup'),
      );
      expect(service.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('New Tasks (since yesterday):'),
      );
      expect(service.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Review updated pricing strategy proposal'),
      );
      expect(service.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Grouped Tasks:'),
      );
      expect(service.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Product:'),
      );
      expect(service.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Evaluate latest UX feedback'),
      );
    });
  });

  describe('sendAfternoonMessage', () => {
    it('should format and send an afternoon message', async () => {
      // Mock the sendMessage method
      jest.spyOn(service, 'sendMessage').mockResolvedValue();

      const completedTasks = ['Complete presentation for tomorrow [View Task]'];
      const newInboxTasks = ['Review client feedback [View Task]'];
      const groupedTasks = {
        Priority: ['Finalize quarterly report [View Task]'],
        Communication: ['Follow up with marketing team [View Task]'],
      };

      await service.sendAfternoonMessage(
        completedTasks,
        newInboxTasks,
        groupedTasks,
      );

      expect(service.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Afternoon update!'),
      );
      expect(service.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Completed since morning:'),
      );
      expect(service.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Complete presentation for tomorrow'),
      );
      expect(service.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('New inbox tasks:'),
      );
      expect(service.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Review client feedback'),
      );
      expect(service.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Remaining tasks:'),
      );
      expect(service.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Priority:'),
      );
      expect(service.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Finalize quarterly report'),
      );
    });
  });

  describe('sendEveningMessage', () => {
    it('should format and send an evening message', async () => {
      // Mock the sendMessage method
      jest.spyOn(service, 'sendMessage').mockResolvedValue();

      const groupedInboxTasks = {
        Planning: ["Plan agenda for tomorrow's meeting [View Task]"],
        Review: ['Review marketing materials [View Task]'],
      };

      await service.sendEveningMessage(groupedInboxTasks);

      expect(service.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Evening reminder'),
      );
      expect(service.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Inbox tasks to triage:'),
      );
      expect(service.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Planning:'),
      );
      expect(service.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining("Plan agenda for tomorrow's meeting"),
      );
      expect(service.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Review:'),
      );
      expect(service.sendMessage).toHaveBeenCalledWith(
        expect.stringContaining('Review marketing materials'),
      );
    });
  });
});
