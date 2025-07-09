import { Test, TestingModule } from '@nestjs/testing';
import { GroupingService } from '../../../lib/logic/grouping/grouping.service';
import { ConfigService } from '../../../lib/core/services/config.service';
import { Task } from '../../../lib/core/models/task.model';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai');

describe('GroupingService', () => {
  let service: GroupingService;
  let configService: ConfigService;
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupingService,
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = module.get<GroupingService>(GroupingService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize OpenAI with API key from ConfigService', () => {
    expect(configService.getOpenAiApiKey).toHaveBeenCalled();
    expect(OpenAI).toHaveBeenCalledWith({ apiKey: 'mock-openai-key' });
  });

  describe('groupTasks', () => {
    it('should group tasks by categories using GPT', async () => {
      // Sample tasks
      const tasks = [
        new Task({
          id: '1',
          content: 'Review product feedback',
          url: 'https://todoist.com/task/1',
        }),
        new Task({
          id: '2',
          content: 'Update weekly report',
          url: 'https://todoist.com/task/2',
        }),
        new Task({
          id: '3',
          content: 'Contact client about invoice',
          url: 'https://todoist.com/task/3',
        }),
      ];

      // Mock GPT response
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                Product: [
                  'Review product feedback [View Task](https://todoist.com/task/1)',
                ],
                Reporting: [
                  'Update weekly report [View Task](https://todoist.com/task/2)',
                ],
                Client: [
                  'Contact client about invoice [View Task](https://todoist.com/task/3)',
                ],
              }),
            },
          },
        ],
      };

      mockOpenAICreate.mockResolvedValue(mockResponse as any);

      const groupedTasks = await service.groupTasks(tasks);

      // Verify OpenAI API was called with appropriate prompt
      expect(mockOpenAICreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4.1-mini',
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('group these tasks logically'),
            }),
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('Review product feedback'),
            }),
          ]),
        }),
      );

      // Verify grouped tasks
      expect(groupedTasks).toEqual({
        Product: [
          'Review product feedback [View Task](https://todoist.com/task/1)',
        ],
        Reporting: [
          'Update weekly report [View Task](https://todoist.com/task/2)',
        ],
        Client: [
          'Contact client about invoice [View Task](https://todoist.com/task/3)',
        ],
      });
    });

    it('should handle empty task list', async () => {
      const groupedTasks = await service.groupTasks([]);

      // Should not call OpenAI for empty list
      expect(mockOpenAICreate).not.toHaveBeenCalled();

      // Should return empty object
      expect(groupedTasks).toEqual({});
    });

    it('should handle errors from OpenAI API', async () => {
      // Sample tasks
      const tasks = [
        new Task({
          id: '1',
          content: 'Review product feedback',
          url: 'https://todoist.com/task/1',
        }),
      ];

      // Mock API error
      mockOpenAICreate.mockRejectedValue(new Error('API error'));

      await expect(service.groupTasks(tasks)).rejects.toThrow(
        'Failed to group tasks with GPT: API error',
      );
    });

    it('should handle invalid JSON response from GPT', async () => {
      // Sample tasks
      const tasks = [
        new Task({
          id: '1',
          content: 'Review product feedback',
          url: 'https://todoist.com/task/1',
        }),
      ];

      // Mock invalid JSON response
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'This is not valid JSON',
            },
          },
        ],
      };

      mockOpenAICreate.mockResolvedValue(mockResponse as any);

      await expect(service.groupTasks(tasks)).rejects.toThrow(
        'Failed to parse GPT response as JSON',
      );
    });
  });

  describe('identifyNewTasks', () => {
    it('should identify tasks that are new since a reference date', async () => {
      // Create reference date
      const referenceDate = new Date('2023-01-01T12:00:00Z');

      // Create tasks with different creation dates
      const tasks = [
        new Task({
          id: '1',
          content: 'Old task',
          createdAt: new Date('2022-12-31T10:00:00Z'), // Before reference
          url: 'https://todoist.com/task/1',
        }),
        new Task({
          id: '2',
          content: 'New task 1',
          createdAt: new Date('2023-01-01T14:00:00Z'), // After reference
          url: 'https://todoist.com/task/2',
        }),
        new Task({
          id: '3',
          content: 'New task 2',
          createdAt: new Date('2023-01-02T09:00:00Z'), // After reference
          url: 'https://todoist.com/task/3',
        }),
      ];

      const newTasks = service.identifyNewTasks(tasks, referenceDate);

      expect(newTasks).toHaveLength(2);
      expect(newTasks[0].id).toBe('2');
      expect(newTasks[1].id).toBe('3');
    });

    it('should handle case when no tasks are new', () => {
      // Create reference date
      const referenceDate = new Date('2023-01-03T12:00:00Z');

      // Create tasks with earlier creation dates
      const tasks = [
        new Task({
          id: '1',
          content: 'Old task 1',
          createdAt: new Date('2023-01-01T10:00:00Z'), // Before reference
          url: 'https://todoist.com/task/1',
        }),
        new Task({
          id: '2',
          content: 'Old task 2',
          createdAt: new Date('2023-01-02T14:00:00Z'), // Before reference
          url: 'https://todoist.com/task/2',
        }),
      ];

      const newTasks = service.identifyNewTasks(tasks, referenceDate);

      expect(newTasks).toHaveLength(0);
    });

    it('should handle tasks without creation dates', () => {
      // Create reference date
      const referenceDate = new Date('2023-01-01T12:00:00Z');

      // Create tasks with and without creation dates
      const tasks = [
        new Task({
          id: '1',
          content: 'Task with old date',
          createdAt: new Date('2022-12-31T10:00:00Z'), // Before reference
          url: 'https://todoist.com/task/1',
        }),
        new Task({
          id: '2',
          content: 'New task',
          createdAt: new Date('2023-01-02T14:00:00Z'), // After reference
          url: 'https://todoist.com/task/2',
        }),
      ];

      const newTasks = service.identifyNewTasks(tasks, referenceDate);

      // Only the task with a valid creation date after the reference should be included
      expect(newTasks).toHaveLength(1);
      expect(newTasks[0].id).toBe('2');
    });
  });
});
