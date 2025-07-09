import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { MessagingService } from '../../lib/logic/messaging/messaging.service';
import { GroupingService } from '../../lib/logic/grouping/grouping.service';
import { ConfigService } from '../../lib/core/services/config.service';
import { Task } from '../../lib/core/models/task.model';
import { CalendarEvent } from '../../lib/core/models/calendar-event.model';
import { MockOpenAI, mockTaskGroupingResponse, mockMotivationResponse, mockInboxGroupingResponse } from '../mocks/openai.mock';
import { TelegramService } from '../../lib/core/services/telegram.service';
import { TodoistService } from '../../lib/core/services/todoist.service';
import { ICalService } from '../../lib/core/services/ical.service';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai');

describe('MessagingService Integration', () => {
  let messagingService: MessagingService;
  let groupingService: GroupingService;
  let configService: ConfigService;
  let telegramService: TelegramService;
  let todoistService: TodoistService;
  let icalService: ICalService;
  let mockOpenAIInstance: MockOpenAI;

  beforeEach(async () => {
    // Setup OpenAI mock with proper implementation first
    mockOpenAIInstance = new MockOpenAI();
    
    // Make sure create method is properly mocked
    mockOpenAIInstance.chat.completions.create.mockImplementation((args: any) => {
      // Capture the prompt and return appropriate response
      const userMessage = args.messages.find((m: any) => m.role === 'user')?.content || '';
      
      if (userMessage.includes('Completed tasks:')) {
        return Promise.resolve(mockMotivationResponse);
      } else if (userMessage.includes('inbox')) {
        return Promise.resolve(mockInboxGroupingResponse);
      } else {
        return Promise.resolve(mockTaskGroupingResponse);
      }
    });
    
    // Mock the OpenAI constructor
    (OpenAI as unknown as jest.Mock).mockImplementation(() => mockOpenAIInstance);
    
    // Create mocks for services
    const telegramServiceMock = {
      sendMessage: jest.fn().mockResolvedValue(undefined),
    };

    const todoistServiceMock = {
      getRelevantTasks: jest.fn(),
      getCompletedTasksSince: jest.fn(),
      getRemainingTasksForAfternoon: jest.fn(),
      getInboxTasksWithoutDueDates: jest.fn(),
    };

    const icalServiceMock = {
      getTodayEvents: jest.fn(),
    };

    // Create a testing module with actual ConfigService and GroupingService
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
        }),
      ],
      providers: [
        ConfigService,
        GroupingService,
        MessagingService,
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

    messagingService = module.get<MessagingService>(MessagingService);
    groupingService = module.get<GroupingService>(GroupingService);
    configService = module.get<ConfigService>(ConfigService);
    telegramService = module.get<TelegramService>(TelegramService);
    todoistService = module.get<TodoistService>(TodoistService);
    icalService = module.get<ICalService>(ICalService);
    
    // CRITICAL: Directly inject our mock into the service to ensure it uses our mock
    (messagingService as any).openaiClient = mockOpenAIInstance;
    
    // Mock groupingService.groupTasks to avoid double API calls
    jest.spyOn(groupingService, 'groupTasks').mockImplementation((tasks) => {
      if (tasks.length === 0) return Promise.resolve({});
      
      // Group tasks by a simple rule for testing
      const grouped: Record<string, Task[]> = {
        'Work Tasks': [],
        'Personal Tasks': []
      };
      
      tasks.forEach(task => {
        if (task.content.toLowerCase().includes('work') || 
            task.content.toLowerCase().includes('report') || 
            task.content.toLowerCase().includes('meeting') ||
            task.content.toLowerCase().includes('product') ||
            task.content.toLowerCase().includes('review') ||
            task.content.toLowerCase().includes('strategy')) {
          grouped['Work Tasks'].push(task);
        } else {
          grouped['Personal Tasks'].push(task);
        }
      });
      
      // Remove empty groups
      Object.keys(grouped).forEach(key => {
        if (grouped[key].length === 0) {
          delete grouped[key];
        }
      });
      
      return Promise.resolve(grouped);
    });
    
    // Mock groupingService.identifyNewTasks to use our implementation
    jest.spyOn(groupingService, 'identifyNewTasks').mockImplementation((tasks, referenceDate) => {
      return tasks.filter(task => task.createdAt && task.createdAt > referenceDate);
    });
  });

  it('should be defined', () => {
    expect(messagingService).toBeDefined();
  });

  describe('formatMorningMessage', () => {
    it('should format morning message with all required sections', async () => {
      // Create sample calendar events
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
      
      // Create sample tasks
      const allTasks = [
        new Task({
          id: '1',
          content: 'Review product feedback',
          url: 'https://todoist.com/task/1',
          priority: 4, // High priority
          createdAt: new Date('2023-01-01T10:00:00Z'),
        }),
        new Task({
          id: '2',
          content: 'Update weekly report',
          url: 'https://todoist.com/task/2',
          priority: 2, // Low priority
          createdAt: new Date('2023-01-14T11:00:00Z'),
        }),
        new Task({
          id: '3',
          content: 'Review updated pricing strategy proposal',
          url: 'https://todoist.com/task/3',
          priority: 3, // Medium priority
          createdAt: new Date('2023-01-15T07:00:00Z'),
        }),
      ];
      
      // Since formatMorningMessage is private, we need to test via sendMorningMessage
      jest.spyOn(icalService, 'getTodayEvents').mockResolvedValue(calendarEvents);
      jest.spyOn(todoistService, 'getRelevantTasks').mockResolvedValue(allTasks);
      jest.spyOn(telegramService, 'sendMessage').mockResolvedValue();
      
      await messagingService.sendMorningMessage();
      const message = (telegramService.sendMessage as jest.Mock).mock.calls[0][0] as string;
      
      // Verify the message contains all required sections
      expect(message).toContain('Good Morning');
      expect(message).toContain('Calendar');
      expect(message).toContain('Team Daily Standup');
      expect(message).toContain('Strategic Roadmap Discussion');
      expect(message).toContain('Today\'s Focus');

      // Verify deeplinks are included
      expect(message).toContain('[View Task](https://todoist.com/task/1)');
      expect(message).toContain('[View Task](https://todoist.com/task/2)');
      expect(message).toContain('[View Task](https://todoist.com/task/3)');
      
      // Verify that the groupingService and OpenAI were called correctly
      expect(groupingService.groupTasks).toHaveBeenCalled();
      // OpenAI is not called for morning messages anymore since we removed inspiration
    });
  });

  describe('formatAfternoonMessage', () => {
    it('should format afternoon message with completed and remaining tasks', async () => {
      // Create sample completed tasks
      const completedTasks = [
        new Task({
          id: '1',
          content: 'Complete presentation for tomorrow',
          url: 'https://todoist.com/task/1',
          isCompleted: true,
        }),
      ];
      
      // Create sample remaining tasks
      const remainingTasks = [
        new Task({
          id: '3',
          content: 'Finalize quarterly report',
          url: 'https://todoist.com/task/3',
        }),
      ];
      
      // Format the afternoon message
      const message = await messagingService.formatAfternoonMessage(
        completedTasks, 
        remainingTasks
      );
      
      // Verify the message contains all required sections
      expect(message).toContain('Afternoon Update');
      expect(message).toContain('Completed');
      expect(message).toContain('Complete presentation for tomorrow');
      expect(message).toContain('Remaining');
      
      // Verify that the groupingService and OpenAI were called correctly
      expect(groupingService.groupTasks).toHaveBeenCalledTimes(1); // Once for remaining tasks only
      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('Completed tasks:'),
            }),
          ]),
        })
      );
    });
  });

  describe('formatEveningMessage', () => {
    it('should format evening message with completed tasks and inbox tasks', async () => {
      // Create sample completed tasks
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

      // Create sample inbox tasks
      const inboxTasks = [
        new Task({
          id: '3',
          content: 'Plan agenda for tomorrow\'s meeting',
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
      
      // Format the evening message
      const message = await messagingService.formatEveningMessage(completedTasks, inboxTasks);
      
      // Verify the message contains all required sections
      expect(message).toContain('Evening Check');
      expect(message).toContain('Completed Today');
      expect(message).toContain('Complete presentation for tomorrow');
      expect(message).toContain('Check emails');
      expect(message).toContain('Inbox Triage');

      // Verify that evening reflection was generated
      // The message should contain some form of motivational/reflective content
      expect(message).toMatch(/🌅.*$/m); // Should contain sunset emoji followed by reflection text
      
      // The mock groupingService will group these tasks into categories
      // Verify the content is there
      expect(message).toContain('Plan agenda for tomorrow');
      expect(message).toContain('Review marketing materials');
      
      // Verify that the groupingService and OpenAI were called correctly
      expect(groupingService.groupTasks).toHaveBeenCalledWith(inboxTasks);
      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('Completed tasks today:'),
            }),
          ]),
        })
      );
    });

    it('should handle empty completed tasks and empty inbox', async () => {
      const message = await messagingService.formatEveningMessage([], []);
      
      expect(message).toContain('Evening Check');
      expect(message).toContain('Nothing completed today');
      expect(message).toContain('Inbox is empty');

      // Verify that evening reflection was generated even for empty day
      expect(message).toMatch(/🌅.*$/m); // Should contain sunset emoji followed by reflection text
      
      // Should not call groupTasks for empty list
      expect(groupingService.groupTasks).not.toHaveBeenCalled();

      // Verify that OpenAI was called for evening reflection with empty context
      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('No tasks completed today'),
            }),
          ]),
        })
      );
    });
  });
});
