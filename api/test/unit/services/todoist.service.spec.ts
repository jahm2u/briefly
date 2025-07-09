import { Test, TestingModule } from '@nestjs/testing';
import { TodoistService } from '../../../lib/core/services/todoist.service';
import { ConfigService } from '../../../lib/core/services/config.service';
import { Task } from '../../../lib/core/models/task.model';
import { TodoistApi } from '@doist/todoist-api-typescript';

// Mock the TodoistApi class
jest.mock('@doist/todoist-api-typescript');

describe('TodoistService', () => {
  let service: TodoistService;
  let configService: ConfigService;
  let mockGetTasks: jest.Mock;

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create a mock for ConfigService
    const configServiceMock = {
      getTodoistApiToken: jest.fn().mockReturnValue('mock-token'),
    };

    // Set up the TodoistApi mock
    mockGetTasks = jest.fn();
    const todoistApiMock = {
      getTasks: mockGetTasks,
    };
    (TodoistApi as jest.Mock).mockImplementation(() => todoistApiMock);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TodoistService,
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = module.get<TodoistService>(TodoistService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize TodoistApi with token from ConfigService', () => {
    expect(configService.getTodoistApiToken).toHaveBeenCalled();
    expect(TodoistApi).toHaveBeenCalledWith('mock-token');
  });

  describe('getTasks', () => {
    it('should fetch all active tasks and convert them to Task models', async () => {
      // Mock Todoist API response
      const todoistTasks = [
        {
          id: '1',
          content: 'Task 1',
          project_id: 'project1',
          is_completed: false,
          url: 'https://todoist.com/task/1',
          created_at: '2023-01-01T12:00:00.000Z',
        },
        {
          id: '2',
          content: 'Task 2',
          project_id: null,
          is_completed: false,
          url: 'https://todoist.com/task/2',
          created_at: '2023-01-02T12:00:00.000Z',
        },
      ];

      mockGetTasks.mockResolvedValue(todoistTasks);

      const tasks = await service.getTasks();

      expect(mockGetTasks).toHaveBeenCalled();
      expect(tasks).toHaveLength(2);
      expect(tasks[0]).toBeInstanceOf(Task);
      expect(tasks[0].id).toBe('1');
      expect(tasks[0].content).toBe('Task 1');
      expect(tasks[0].projectId).toBe('project1');
      expect(tasks[0].isCompleted).toBe(false);
      expect(tasks[0].url).toBe('https://todoist.com/task/1');
      expect(tasks[0].createdAt).toBeInstanceOf(Date);

      expect(tasks[1].id).toBe('2');
      expect(tasks[1].projectId).toBeNull();
    });

    it('should handle errors when fetching tasks', async () => {
      // Mock API error
      mockGetTasks.mockRejectedValue(new Error('API error'));

      await expect(service.getTasks()).rejects.toThrow(
        'Failed to fetch Todoist tasks: API error',
      );
    });
  });

  describe('getInboxTasks', () => {
    it('should return only tasks without a project ID', async () => {
      // Mock getTasks method
      const allTasks = [
        new Task({
          id: '1',
          content: 'Project task',
          projectId: 'project1',
        }),
        new Task({
          id: '2',
          content: 'Inbox task 1',
          projectId: null,
        }),
        new Task({
          id: '3',
          content: 'Inbox task 2',
          projectId: null,
        }),
      ];

      jest.spyOn(service, 'getTasks').mockResolvedValue(allTasks);

      const inboxTasks = await service.getInboxTasks();

      expect(service.getTasks).toHaveBeenCalled();
      expect(inboxTasks).toHaveLength(2);
      expect(inboxTasks[0].id).toBe('2');
      expect(inboxTasks[1].id).toBe('3');
      expect(inboxTasks.every((task) => task.isInInbox())).toBe(true);
    });
  });

  describe('getCompletedTasksSince', () => {
    it('should fetch tasks completed since the given date', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      // Mock completed tasks
      const completedTasks = [
        {
          id: '1',
          content: 'Completed task 1',
          project_id: 'project1',
          is_completed: true,
          url: 'https://todoist.com/task/1',
          created_at: '2023-01-01T12:00:00.000Z',
          completed_at: new Date().toISOString(),
        },
      ];

      mockGetTasks.mockResolvedValue(completedTasks);
      jest.spyOn(service, 'getTasks');

      const tasks = await service.getCompletedTasksSince(yesterday);

      expect(service.getTasks).toHaveBeenCalled();
      expect(tasks).toHaveLength(1);
      expect(tasks[0]).toBeInstanceOf(Task);
      expect(tasks[0].id).toBe('1');
      expect(tasks[0].isCompleted).toBe(true);
    });

    it('should handle errors when fetching completed tasks', async () => {
      // Mock API error
      jest.spyOn(service, 'getTasks').mockRejectedValue(new Error('API error'));

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await expect(service.getCompletedTasksSince(yesterday)).rejects.toThrow(
        'Failed to fetch completed Todoist tasks: API error',
      );
    });
  });

  describe('getTaskDeepLink', () => {
    it('should generate a task deeplink with the correct URL', () => {
      const task = new Task({
        id: '123',
        content: 'Test task',
        url: 'https://todoist.com/task/123',
      });

      const deepLink = service.getTaskDeepLink(task);
      expect(deepLink).toBe('[View Task](https://todoist.com/task/123)');
    });

    it('should handle tasks without a URL', () => {
      const task = new Task({
        id: '123',
        content: 'Test task',
        url: null,
      });

      const deepLink = service.getTaskDeepLink(task);
      expect(deepLink).toBe('');
    });
  });
});
