import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { GroupingService } from '../../lib/logic/grouping/grouping.service';
import { ConfigService } from '../../lib/core/services/config.service';
import { Task } from '../../lib/core/models/task.model';
import {
  MockOpenAI,
  mockTaskGroupingResponse,
  mockMotivationResponse,
} from '../mocks/openai.mock';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai');

describe('GroupingService Integration', () => {
  let groupingService: GroupingService;
  let mockOpenAIInstance: MockOpenAI;

  beforeEach(async () => {
    // Setup OpenAI mock with proper implementation first
    mockOpenAIInstance = new MockOpenAI();

    // Make sure create method is properly mocked
    mockOpenAIInstance.chat.completions.create.mockImplementation(
      (args: any) => {
        // Capture the prompt and return appropriate response
        const userMessage =
          args.messages.find((m: any) => m.role === 'user')?.content || '';

        if (userMessage.includes('Review product feedback')) {
          return Promise.resolve(mockTaskGroupingResponse);
        } else if (userMessage.includes('Completed tasks:')) {
          return Promise.resolve(mockMotivationResponse);
        } else {
          return Promise.resolve(mockTaskGroupingResponse);
        }
      },
    );

    // Mock the OpenAI constructor
    (OpenAI as unknown as jest.Mock).mockImplementation(
      () => mockOpenAIInstance,
    );

    // Create a testing module with actual ConfigService
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
        }),
      ],
      providers: [ConfigService, GroupingService],
    }).compile();

    groupingService = module.get<GroupingService>(GroupingService);

    // CRITICAL: Directly inject our mock into the service to ensure it uses our mock
    (groupingService as any).openaiClient = mockOpenAIInstance;
  });

  it('should be defined', () => {
    expect(groupingService).toBeDefined();
  });

  it('should initialize OpenAI with the correct API key', () => {
    expect(OpenAI).toHaveBeenCalledWith({ apiKey: 'test-openai-key' });
  });

  describe('groupTasks', () => {
    it('should group tasks using GPT', async () => {
      // Create sample tasks
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
          id: '4',
          content: 'Prepare presentation for tomorrow',
          url: 'https://todoist.com/task/4',
        }),
        new Task({
          id: '3',
          content: 'Contact client about invoice',
          url: 'https://todoist.com/task/3',
        }),
        new Task({
          id: '5',
          content: 'Follow up with marketing team',
          url: 'https://todoist.com/task/5',
        }),
      ];

      // Group the tasks
      const groupedTasks = await groupingService.groupTasks(tasks);

      // Verify OpenAI API was called with appropriate parameters
      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith(
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
          response_format: { type: 'json_object' },
        }),
      );

      // Verify the grouped tasks match our expected format
      expect(groupedTasks).toHaveProperty('Product');
      expect(groupedTasks).toHaveProperty('Reporting');
      expect(groupedTasks).toHaveProperty('Client');
      expect(groupedTasks).toHaveProperty('Communication');

      // Check specific tasks are in the right groups - task objects should be used instead of strings
      expect(
        groupedTasks.Product.some((task) =>
          task.content.includes('Review product feedback'),
        ),
      ).toBe(true);
      expect(
        groupedTasks.Reporting.some((task) =>
          task.content.includes('Update weekly report'),
        ),
      ).toBe(true);
      expect(
        groupedTasks.Reporting.some((task) =>
          task.content.includes('Prepare presentation'),
        ),
      ).toBe(true);
      expect(
        groupedTasks.Client.some((task) =>
          task.content.includes('Contact client'),
        ),
      ).toBe(true);
      expect(
        groupedTasks.Communication.some((task) =>
          task.content.includes('Follow up with marketing'),
        ),
      ).toBe(true);
    });

    it('should handle empty task list', async () => {
      const tasks: Task[] = [];
      const groupedTasks = await groupingService.groupTasks(tasks);

      expect(mockOpenAIInstance.chat.completions.create).not.toHaveBeenCalled();
      expect(groupedTasks).toEqual({});
    });
  });

  describe('identifyNewTasks', () => {
    it('should identify tasks created after a reference date', () => {
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

      const newTasks = groupingService.identifyNewTasks(tasks, referenceDate);

      expect(newTasks).toHaveLength(2);
      expect(newTasks[0].id).toBe('2');
      expect(newTasks[1].id).toBe('3');
    });
  });
});
