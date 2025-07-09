import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { SchedulerService } from '../../lib/core/services/scheduler.service';
import { TodoistService } from '../../lib/core/services/todoist.service';
import { ICalService } from '../../lib/core/services/ical.service';
import { TelegramService } from '../../lib/core/services/telegram.service';
import { MessagingService } from '../../lib/logic/messaging/messaging.service';
import { GroupingService } from '../../lib/logic/grouping/grouping.service';
import { ConfigService } from '../../lib/core/services/config.service';
import { Task } from '../../lib/core/models/task.model';
import { CalendarEvent } from '../../lib/core/models/calendar-event.model';

describe('SchedulerService Integration', () => {
  let schedulerService: SchedulerService;
  let todoistService: TodoistService;
  let icalService: ICalService;
  let telegramService: TelegramService;
  let messagingService: MessagingService;

  beforeEach(async () => {
    // Create mock services with proper Jest mock functions
    const todoistServiceMock = {
      getTasks: jest.fn().mockImplementation(() => Promise.resolve([])),
      getRelevantTasks: jest.fn().mockImplementation(() => Promise.resolve([])),
      getInboxTasks: jest.fn().mockImplementation(() => Promise.resolve([])),
      getCompletedTasksSince: jest.fn().mockImplementation(() => Promise.resolve([])),
    };

    const icalServiceMock = {
      getTodayEvents: jest.fn().mockImplementation(() => Promise.resolve([])),
    };

    const telegramServiceMock = {
      sendMessage: jest.fn().mockImplementation(() => Promise.resolve()),
    };

    const messagingServiceMock = {
      sendMorningMessage: jest.fn().mockImplementation(() => Promise.resolve()),
      sendAfternoonMessage: jest.fn().mockImplementation(() => Promise.resolve()),
      sendEveningMessage: jest.fn().mockImplementation(() => Promise.resolve()),
    };

    const groupingServiceMock = {
      groupTasks: jest.fn().mockImplementation(() => Promise.resolve({})),
      identifyNewTasks: jest.fn().mockImplementation(() => []),
    };

    // Create a testing module with mocked services
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
        }),
      ],
      providers: [
        ConfigService,
        SchedulerService,
        { provide: TodoistService, useValue: todoistServiceMock },
        { provide: ICalService, useValue: icalServiceMock },
        { provide: TelegramService, useValue: telegramServiceMock },
        { provide: MessagingService, useValue: messagingServiceMock },
        { provide: GroupingService, useValue: groupingServiceMock },
      ],
    }).compile();

    schedulerService = module.get<SchedulerService>(SchedulerService);
    todoistService = module.get<TodoistService>(TodoistService);
    icalService = module.get<ICalService>(ICalService);
    telegramService = module.get<TelegramService>(TelegramService);
    messagingService = module.get<MessagingService>(MessagingService);
  });

  it('should be defined', () => {
    expect(schedulerService).toBeDefined();
  });

  describe('sendMorningMessage', () => {
    it('should fetch required data and send the morning message', async () => {
      // Mock the current date
      const mockDate = new Date('2023-01-15T07:00:00Z');
      jest.useFakeTimers().setSystemTime(mockDate);
      
      // Mock calendar events
      const mockCalendarEvents = [
        new CalendarEvent({
          id: 'event1',
          summary: 'Team Daily Standup',
          startTime: new Date('2023-01-15T09:00:00Z'),
          endTime: new Date('2023-01-15T09:30:00Z'),
        }),
      ];
      
      // Mock tasks
      const mockTasks = [
        new Task({
          id: '1',
          content: 'Review product feedback',
          url: 'https://todoist.com/task/1',
        }),
      ];
      
      // Set up mock responses
      (icalService.getTodayEvents as jest.Mock).mockImplementation(() => Promise.resolve(mockCalendarEvents));
      (todoistService.getRelevantTasks as jest.Mock).mockImplementation(() => Promise.resolve(mockTasks));
      (todoistService.getTasks as jest.Mock).mockImplementation(() => Promise.resolve(mockTasks));
      // Execute the morning message function
      await schedulerService.sendMorningMessage();
      
      // Verify the services were called with the correct arguments
      expect(icalService.getTodayEvents).toHaveBeenCalled();
      expect(todoistService.getRelevantTasks).toHaveBeenCalled();
      expect(todoistService.getTasks).toHaveBeenCalled();
      expect(messagingService.sendMorningMessage).toHaveBeenCalled();
      
      // Reset timer mocks
      jest.useRealTimers();
    });
  });

  describe('sendAfternoonMessage', () => {
    it('should fetch required data and send the afternoon message', async () => {
      // Mock the current date
      const mockDate = new Date('2023-01-15T14:00:00Z');
      jest.useFakeTimers().setSystemTime(mockDate);
      
      // Mock completed tasks
      const mockCompletedTasks = [
        new Task({
          id: '1',
          content: 'Completed task',
          url: 'https://todoist.com/task/1',
          isCompleted: true,
        }),
      ];
      
      // Mock inbox tasks
      const mockInboxTasks = [
        new Task({
          id: '2',
          content: 'Inbox task',
          url: 'https://todoist.com/task/2',
          projectId: null,
        }),
      ];
      
      // Mock all current tasks
      const mockAllTasks = [
        ...mockInboxTasks,
        new Task({
          id: '3',
          content: 'Other task',
          url: 'https://todoist.com/task/3',
          projectId: 'project1',
        }),
      ];
      
      // Set up mock responses
      (todoistService.getCompletedTasksSince as jest.Mock).mockImplementation(() => Promise.resolve(mockCompletedTasks));
      (todoistService.getInboxTasks as jest.Mock).mockImplementation(() => Promise.resolve(mockInboxTasks));
      (todoistService.getTasks as jest.Mock).mockImplementation(() => Promise.resolve(mockAllTasks));
      // Initialize the lastMorningDate for the test
      (schedulerService as any).lastMorningDate = new Date('2023-01-15T07:00:00Z');
      (schedulerService as any).morningTasks = [];
      
      // Execute the afternoon message function
      await schedulerService.sendAfternoonMessage();
      
      // Verify the services were called with the correct arguments
      expect(todoistService.getCompletedTasksSince).toHaveBeenCalledWith(
        expect.any(Date)
      );
      expect(todoistService.getInboxTasks).toHaveBeenCalled();
      expect(todoistService.getTasks).toHaveBeenCalled();
      expect(messagingService.sendAfternoonMessage).toHaveBeenCalled();
      
      // Reset timer mocks
      jest.useRealTimers();
    });
  });

  describe('sendEveningMessage', () => {
    it('should fetch inbox tasks and send the evening message', async () => {
      // Mock inbox tasks
      const mockInboxTasks = [
        new Task({
          id: '1',
          content: 'Inbox task',
          url: 'https://todoist.com/task/1',
          projectId: null,
        }),
      ];
      
      // Set up mock responses
      (todoistService.getInboxTasks as jest.Mock).mockImplementation(() => Promise.resolve(mockInboxTasks));
      // Execute the evening message function
      await schedulerService.sendEveningMessage();
      
      // Verify the services were called with the correct arguments
      expect(todoistService.getInboxTasks).toHaveBeenCalled();
      expect(messagingService.sendEveningMessage).toHaveBeenCalled();
    });
  });
});
