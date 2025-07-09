import { Test, TestingModule } from '@nestjs/testing';
import { MessagingService } from '../../../lib/logic/messaging/messaging.service';
import { ConfigService } from '../../../lib/core/services/config.service';
import { Task } from '../../../lib/core/models/task.model';
import { CalendarEvent } from '../../../lib/core/models/calendar-event.model';
import OpenAI from 'openai';
import { GroupingService } from '../../../lib/logic/grouping/grouping.service';
import { TelegramService } from '../../../lib/core/services/telegram.service';
import { TodoistService } from '../../../lib/core/services/todoist.service';
import { ICalService } from '../../../lib/core/services/ical.service';

// Mock OpenAI
jest.mock('openai');

describe('MessagingService', () => {
  let service: MessagingService;
  let configService: ConfigService;
  let groupingService: GroupingService;
  let telegramService: TelegramService;
  let todoistService: TodoistService;
  let icalService: ICalService;
  let mockOpenAICreate: jest.Mock;

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create a mock for ConfigService
    const configServiceMock = {
      getOpenAiApiKey: jest.fn().mockReturnValue('mock-openai-key'),
    };

    // Set up OpenAI mock
    mockOpenAICreate = jest.fn();
    const openAiMock = {
      chat: {
        completions: {
          create: mockOpenAICreate,
        },
      },
    };

    (OpenAI as unknown as jest.Mock).mockImplementation(() => openAiMock);

    // Create proper mocks for GroupingService
    const groupingServiceMock = {
      groupTasks: jest.fn(),
      identifyNewTasks: jest.fn(),
    };

    // Create proper mocks for TelegramService
    const telegramServiceMock = {
      sendMessage: jest.fn().mockResolvedValue(undefined),
    };

    // Create proper mocks for TodoistService
    const todoistServiceMock = {
      getRelevantTasks: jest.fn(),
      getCompletedTasksSince: jest.fn(),
      getRemainingTasksForAfternoon: jest.fn(),
      getInboxTasksWithoutDueDates: jest.fn(),
    };

    // Create proper mocks for ICalService
    const icalServiceMock = {
      getTodayEvents: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
        {
          provide: GroupingService,
          useValue: groupingServiceMock,
        },
        {
          provide: TelegramService,
          useValue: telegramServiceMock,
        },
        {
          provide: TodoistService,
          useValue: todoistServiceMock,
        },
        {
          provide: ICalService,
          useValue: icalServiceMock,
        },
      ],
    }).compile();

    service = module.get<MessagingService>(MessagingService);
    configService = module.get<ConfigService>(ConfigService);
    groupingService = module.get<GroupingService>(GroupingService);
    telegramService = module.get<TelegramService>(TelegramService);
    todoistService = module.get<TodoistService>(TodoistService);
    icalService = module.get<ICalService>(ICalService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize OpenAI with API key from ConfigService', () => {
    expect(configService.getOpenAiApiKey).toHaveBeenCalled();
    expect(OpenAI).toHaveBeenCalledWith({ apiKey: 'mock-openai-key' });
  });

  describe('formatMorningMessage', () => {
    it('should format morning message with all required sections', async () => {
      // Sample calendar events
      const calendarEvents = [
        new CalendarEvent({
          id: 'event1',
          summary: 'Team Daily Standup',
          startTime: new Date('2023-01-15T09:00:00Z'),
          endTime: new Date('2023-01-15T09:30:00Z'),
        }),
        new CalendarEvent({
          id: 'event2',
          summary: 'Strategic Roadmap Discussion',
          startTime: new Date('2023-01-15T14:00:00Z'),
          endTime: new Date('2023-01-15T15:00:00Z'),
        }),
      ];

      // Sample tasks
      const allTasks = [
        new Task({
          id: '1',
          content: 'Review updated pricing strategy proposal',
          url: 'https://todoist.com/task/1',
          priority: 4, // High priority
          createdAt: new Date('2023-01-15T07:00:00Z'),
        }),
        new Task({
          id: '2',
          content: 'Evaluate latest UX feedback from users',
          url: 'https://todoist.com/task/2',
          priority: 2, // Low priority
          createdAt: new Date('2023-01-14T10:00:00Z'),
        }),
        new Task({
          id: '3',
          content: 'Follow up on billing discrepancy issue',
          url: 'https://todoist.com/task/3',
          priority: 1, // Normal priority
          createdAt: new Date('2023-01-14T15:00:00Z'),
        }),
      ];

      // Mock GroupingService responses
      const mockGroupTasks = groupingService.groupTasks as jest.Mock;
      mockGroupTasks.mockResolvedValue({
        Product: [allTasks[1]], // Evaluate latest UX feedback task
        Operational: [allTasks[2]], // Follow up on billing task
        Strategic: [allTasks[0]], // Review pricing strategy task
      });

      // Since formatMorningMessage is private, we need to test via sendMorningMessage
      // Mock the dependencies for sendMorningMessage
      jest
        .spyOn(icalService, 'getTodayEvents')
        .mockResolvedValue(calendarEvents);
      jest
        .spyOn(todoistService, 'getRelevantTasks')
        .mockResolvedValue(allTasks);
      jest.spyOn(telegramService, 'sendMessage').mockResolvedValue();

      // Call sendMorningMessage and capture the message sent to Telegram
      await service.sendMorningMessage();

      // Get the captured message from the mock
      const result = (telegramService.sendMessage as jest.Mock).mock
        .calls[0][0] as string;

      // Verify GroupingService was called correctly
      expect(mockGroupTasks).toHaveBeenCalledWith(allTasks);

      expect(result).toContain('Good Morning');
      expect(result).toContain('Calendar');
      expect(result).toContain('Team Daily Standup');
      expect(result).toContain('Strategic Roadmap Discussion');
      expect(result).toContain("Today's Focus");
      expect(result).toContain('Product');
      expect(result).toContain('Evaluate latest UX feedback from users');
      expect(result).toContain('[View Task](https://todoist.com/task/2)');
      expect(result).toContain('Operational');
      expect(result).toContain('Follow up on billing discrepancy issue');
      expect(result).toContain('[View Task](https://todoist.com/task/3)');
    });

    it('should handle empty calendar events', async () => {
      // Sample tasks
      const allTasks = [
        new Task({
          id: '1',
          content: 'Review updated pricing strategy proposal',
          url: 'https://todoist.com/task/1',
          priority: 3, // Medium priority
          createdAt: new Date('2023-01-15T07:00:00Z'),
        }),
      ];

      // Mock GroupingService responses
      const mockGroupTasks = groupingService.groupTasks as jest.Mock;
      mockGroupTasks.mockResolvedValue({
        Work: [allTasks[0]], // Review updated pricing strategy proposal
      });

      // Since formatMorningMessage is private, we need to test via sendMorningMessage
      jest.spyOn(icalService, 'getTodayEvents').mockResolvedValue([]);
      jest
        .spyOn(todoistService, 'getRelevantTasks')
        .mockResolvedValue(allTasks);
      jest.spyOn(telegramService, 'sendMessage').mockResolvedValue();

      await service.sendMorningMessage();
      const result = (telegramService.sendMessage as jest.Mock).mock
        .calls[0][0] as string;

      expect(result).toContain('Good Morning');
      expect(result).toContain('No meetings scheduled for today');
      expect(result).toContain("Today's Focus");
      expect(result).toContain('Review updated pricing strategy proposal');
      expect(result).toContain('[View Task](https://todoist.com/task/1)');
    });

    it('should handle single task with calendar events', async () => {
      // Sample calendar events
      const calendarEvents = [
        new CalendarEvent({
          id: 'event1',
          summary: 'Team Daily Standup',
          startTime: new Date('2023-01-15T09:00:00Z'),
          endTime: new Date('2023-01-15T09:30:00Z'),
        }),
      ];

      // Sample tasks
      const allTasks = [
        new Task({
          id: '1',
          content: 'Existing task',
          url: 'https://todoist.com/task/1',
          priority: 1, // Normal priority
          createdAt: new Date('2023-01-14T07:00:00Z'),
        }),
      ];

      // Mock GroupingService responses
      const mockGroupTasks = groupingService.groupTasks as jest.Mock;
      mockGroupTasks.mockResolvedValue({
        Work: [allTasks[0]], // Existing task
      });

      // Since formatMorningMessage is private, we need to test via sendMorningMessage
      jest
        .spyOn(icalService, 'getTodayEvents')
        .mockResolvedValue(calendarEvents);
      jest
        .spyOn(todoistService, 'getRelevantTasks')
        .mockResolvedValue(allTasks);
      jest.spyOn(telegramService, 'sendMessage').mockResolvedValue();

      await service.sendMorningMessage();
      const result = (telegramService.sendMessage as jest.Mock).mock
        .calls[0][0] as string;

      expect(result).toContain('Good Morning');
      expect(result).toContain('Calendar');
      expect(result).toContain('Team Daily Standup');
      expect(result).toContain("Today's Focus");
      expect(result).toContain('Work');
      expect(result).toContain('Existing task');
      expect(result).toContain('[View Task](https://todoist.com/task/1)');
    });
  });

  describe('formatAfternoonMessage', () => {
    it('should format afternoon message with completed and remaining tasks', async () => {
      // Sample completed tasks
      const completedTasks = [
        new Task({
          id: '1',
          content: 'Complete presentation for tomorrow',
          url: 'https://todoist.com/task/1',
          isCompleted: true,
        }),
      ];

      // Sample remaining tasks
      const remainingTasks = [
        new Task({
          id: '3',
          content: 'Finalize quarterly report',
          url: 'https://todoist.com/task/3',
        }),
        new Task({
          id: '4',
          content: 'Follow up with marketing team',
          url: 'https://todoist.com/task/4',
        }),
      ];

      // Mock GroupingService response for remaining tasks
      const mockGroupTasks = groupingService.groupTasks as jest.Mock;
      mockGroupTasks.mockResolvedValue({
        Priority: [remainingTasks[0]], // Finalize quarterly report
        Communication: [remainingTasks[1]], // Follow up with marketing team
      });

      // Mock motivation message from OpenAI
      const mockMotivationResponse = {
        choices: [
          {
            message: {
              content:
                'Great job completing your presentation! Your productivity is setting you up for success.',
            },
          },
        ],
      };

      mockOpenAICreate.mockResolvedValue(mockMotivationResponse as any);

      const result = await service.formatAfternoonMessage(
        completedTasks,
        remainingTasks,
      );

      // Check that GroupingService was called for remaining tasks only
      expect(mockGroupTasks).toHaveBeenCalledTimes(1);
      expect(mockGroupTasks).toHaveBeenCalledWith(remainingTasks);

      // Check that OpenAI was called for motivation message
      expect(mockOpenAICreate).toHaveBeenCalledTimes(1);

      expect(result).toContain('Afternoon Update');
      expect(result).toContain('Completed');
      expect(result).toContain('Complete presentation for tomorrow');
      expect(result).toContain('Remaining');
      expect(result).toContain('Priority');
      expect(result).toContain('Finalize quarterly report');
      expect(result).toContain('Communication');
      expect(result).toContain('Follow up with marketing team');
      expect(result).toContain('Great job completing your presentation!');
    });

    it('should handle no completed tasks', async () => {
      // Empty completed tasks
      const completedTasks: Task[] = [];

      // Sample remaining tasks
      const remainingTasks = [
        new Task({
          id: '2',
          content: 'Finalize quarterly report',
          url: 'https://todoist.com/task/2',
        }),
      ];

      // Mock GroupingService response for remaining tasks
      const mockGroupTasks = groupingService.groupTasks as jest.Mock;
      mockGroupTasks.mockResolvedValue({
        Work: [remainingTasks[0]], // Finalize quarterly report
      });

      const result = await service.formatAfternoonMessage(
        completedTasks,
        remainingTasks,
      );

      expect(result).toContain('Afternoon Update');
      expect(result).toContain('Nothing completed yet');
      expect(result).toContain('Remaining');
      expect(result).toContain('Finalize quarterly report');
      expect(result).toContain('Keep going!');
    });
  });

  describe('formatEveningMessage', () => {
    it('should format evening message with completed tasks and inbox tasks', async () => {
      // Sample completed tasks
      const completedTasks = [
        new Task({
          id: '1',
          content: 'Complete presentation for tomorrow',
          url: 'https://todoist.com/task/1',
          isCompleted: true,
          priority: 4, // High priority
        }),
        new Task({
          id: '2',
          content: 'Check emails',
          url: 'https://todoist.com/task/2',
          isCompleted: true,
          priority: 1, // Normal priority
        }),
      ];

      // Sample inbox tasks
      const inboxTasks = [
        new Task({
          id: '3',
          content: "Plan agenda for tomorrow's meeting",
          url: 'https://todoist.com/task/3',
          projectId: null, // In inbox
        }),
        new Task({
          id: '4',
          content: 'Review marketing materials',
          url: 'https://todoist.com/task/4',
          projectId: null, // In inbox
        }),
      ];

      // Mock GroupingService response
      const mockGroupTasks = groupingService.groupTasks as jest.Mock;
      mockGroupTasks.mockResolvedValue({
        Planning: [inboxTasks[0]], // Plan agenda for tomorrow's meeting
        Review: [inboxTasks[1]], // Review marketing materials
      });

      // Mock evening reflection from OpenAI
      const mockReflectionResponse = {
        choices: [
          {
            message: {
              content:
                'Great progress on key tasks today - tomorrow brings fresh opportunities to tackle your inbox items.',
            },
          },
        ],
      };

      mockOpenAICreate.mockResolvedValue(mockReflectionResponse as any);

      const result = await service.formatEveningMessage(
        completedTasks,
        inboxTasks,
      );

      expect(mockGroupTasks).toHaveBeenCalledWith(inboxTasks);

      // Check that OpenAI was called for evening reflection
      expect(mockOpenAICreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('Completed tasks today:'),
            }),
          ]),
        }),
      );

      expect(result).toContain('Evening Check');
      expect(result).toContain('Completed Today');
      expect(result).toContain('Complete presentation for tomorrow');
      expect(result).toContain('Check emails');
      expect(result).toContain('Inbox Triage');
      expect(result).toContain('Planning');
      expect(result).toContain("Plan agenda for tomorrow's meeting");
      expect(result).toContain('Review');
      expect(result).toContain('Review marketing materials');
      expect(result).toContain('Great progress on key tasks today');
    });

    it('should handle empty completed tasks and empty inbox', async () => {
      // Empty completed and inbox tasks
      const completedTasks: Task[] = [];
      const inboxTasks: Task[] = [];

      // Mock evening reflection for empty day
      const mockReflectionResponse = {
        choices: [
          {
            message: {
              content:
                'Sometimes rest is the most productive thing you can do - recharge for tomorrow.',
            },
          },
        ],
      };

      mockOpenAICreate.mockResolvedValue(mockReflectionResponse as any);

      const result = await service.formatEveningMessage(
        completedTasks,
        inboxTasks,
      );

      // Should not call GroupingService for empty inbox list
      expect(groupingService.groupTasks).not.toHaveBeenCalled();

      // Check that OpenAI was called for evening reflection with empty context
      expect(mockOpenAICreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('No tasks completed today'),
            }),
          ]),
        }),
      );

      expect(result).toContain('Evening Check');
      expect(result).toContain('Nothing completed today');
      expect(result).toContain('Inbox is empty');
      expect(result).toContain('Perfect time to relax');
      expect(result).toContain('Sometimes rest is the most productive thing');
    });
  });
});
