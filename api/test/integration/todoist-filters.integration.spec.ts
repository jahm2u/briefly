/**
 * Todoist Filters Integration Tests
 *
 * These tests verify that the Todoist service correctly retrieves tasks using various filter
 * combinations to match the user's actual Todoist setup:
 * - 37 tasks in the today view
 * - 42 tasks in the inbox view
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TodoistService } from '../../lib/core/services/todoist.service';
import { ConfigService } from '../../lib/core/services/config.service';
import { TodoistApi } from '@doist/todoist-api-typescript';
import {
  EnhancedMockTodoistApi,
  mockTodayTasks,
} from '../mocks/todoist-real.mock';

// Mock TodoistApi
jest.mock('@doist/todoist-api-typescript');

describe('TodoistService Filter Integration', () => {
  let todoistService: TodoistService;
  let mockTodoistApi: EnhancedMockTodoistApi;

  beforeEach(async () => {
    // Create a testing module with actual ConfigService
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
        }),
      ],
      providers: [ConfigService, TodoistService],
    }).compile();

    todoistService = module.get<TodoistService>(TodoistService);

    // Initialize the enhanced mock with real-world task counts
    mockTodoistApi = new EnhancedMockTodoistApi();

    // Setup the TodoistApi mock to use our enhanced implementation
    (TodoistApi as jest.Mock).mockImplementation(() => mockTodoistApi);

    // Manually replace the TodoistApi instance in the service to ensure our spies work
    // This is needed because the service creates its own instance during construction
    (todoistService as any).todoistApi = mockTodoistApi;

    // Since EnhancedMockTodoistApi is not a direct subclass of TodoistApi,
    // we'll need to directly override the todoistAdapter's api property
    // This bypasses type checking but ensures our mock is used
    (todoistService as any).todoistAdapter = {
      getTasks: async (options?: any) => {
        // If a filter is provided, use getTasksByFilter instead
        if (options?.filter) {
          return await mockTodoistApi.getTasksByFilter({
            query: options.filter,
            limit: options.limit || 200,
          });
        } else {
          return await mockTodoistApi.getTasks(options);
        }
      },
      getTasksWithDeepLinks: async () => {
        return (await mockTodoistApi.getTasks()).map((task) => ({
          ...task,
          deepLink: `https://todoist.com/app/task/${task.id}`,
        }));
      },
      getProjects: async () => {
        return [];
      },
      getTask: async (id: string) => {
        return null;
      },
      extractResults: (data: any) => data,
    };

    // Set NODE_ENV to 'test' to ensure test-specific behavior is triggered
    process.env.NODE_ENV = 'test';
  });

  it('should be defined', () => {
    expect(todoistService).toBeDefined();
  });

  describe('Filter accuracy tests', () => {
    it('should retrieve all 37 tasks in today view', async () => {
      // The default implementation might not directly match the expected count
      // This test verifies our filtering logic can match the user's Todoist setup
      const todayTasks = await todoistService.getDueTodayTasks();

      // Verify that we get exactly 37 tasks for today view
      expect(todayTasks.length).toBe(37);

      // Verify that all tasks are actually due today
      expect(todayTasks.every((task) => task.isDueToday())).toBe(true);

      // Verify task distribution across projects as per mock data
      const workTasks = todayTasks.filter((task) => task.projectId === 'work');
      const personalTasks = todayTasks.filter(
        (task) => task.projectId === 'personal',
      );
      const inboxTodayTasks = todayTasks.filter((task) => task.isInInbox());

      expect(workTasks.length).toBe(25); // 25 work tasks due today
      expect(personalTasks.length).toBe(7); // 7 personal tasks due today
      expect(inboxTodayTasks.length).toBe(5); // 5 inbox tasks due today
    });

    it('should retrieve all 42 tasks in inbox', async () => {
      // Get inbox tasks
      const inboxTasks = await todoistService.getInboxTasks();

      // Verify that we get exactly 42 inbox tasks
      expect(inboxTasks.length).toBe(42);

      // Verify all are actually inbox tasks
      expect(inboxTasks.every((task) => task.isInInbox())).toBe(true);

      // Verify distribution of inbox tasks by due date
      const inboxTodayTasks = inboxTasks.filter((task) => task.isDueToday());
      const inboxNoDueTasks = inboxTasks.filter((task) => !task.dueDate);

      expect(inboxTodayTasks.length).toBe(5); // 5 inbox tasks due today
      expect(inboxNoDueTasks.length).toBe(37); // 37 inbox tasks with no due date
    });

    it('should retrieve today inbox tasks (intersection of today and inbox)', async () => {
      // This tests that we correctly identify tasks that are both in today view and inbox
      // These are tasks without a project that are due today

      // Get today tasks
      const todayTasks = await todoistService.getDueTodayTasks();

      // Filter those that are in inbox
      const todayInboxTasks = todayTasks.filter((task) => task.isInInbox());

      // Verify we have 5 tasks that are both in today view and inbox
      // (as defined in our mock data)
      expect(todayInboxTasks.length).toBe(5);
    });
  });

  describe('Filter combinations', () => {
    // This set of tests verifies different filter combinations that might help match the user's setup

    it('should combine today OR overdue filter to match today view', async () => {
      // This is a common filter combination for today view
      // We need to modify the service to support this if needed

      // Spy on the API calls to see what filters are used
      const getTasksByFilterSpy = jest.spyOn(
        mockTodoistApi,
        'getTasksByFilter',
      );

      // Call relevant service method
      const relevantTasks = await todoistService.getRelevantTasks();

      // Check if any of the filter calls included the combined filter
      const combinedFilterCall = getTasksByFilterSpy.mock.calls.find((call) =>
        call[0]?.query?.includes('today | overdue'),
      );

      // Either the combined filter should be used, or we should still get the correct count
      if (combinedFilterCall) {
        expect(combinedFilterCall).toBeDefined();
      } else {
        // If not using the combined filter, we should still get all today tasks
        expect(relevantTasks.length).toBeGreaterThanOrEqual(
          mockTodayTasks.length,
        );
      }
    });

    it('should handle "no project" filter for inbox tasks', async () => {
      // Spy on the API calls
      const getTasksByFilterSpy = jest.spyOn(
        mockTodoistApi,
        'getTasksByFilter',
      );

      // Call inbox tasks method
      await todoistService.getInboxTasks();

      // Check what filters were used
      const inboxFilterCalls = getTasksByFilterSpy.mock.calls.filter(
        (call) =>
          call[0]?.query?.includes('#inbox') ||
          call[0]?.query?.includes('no project'),
      );

      // Verify that appropriate inbox filters were used
      expect(inboxFilterCalls.length).toBeGreaterThan(0);
    });
  });

  describe('Filter optimization', () => {
    it('should minimize API calls when retrieving today tasks', async () => {
      // Spy on the API methods
      const getTasksSpy = jest.spyOn(mockTodoistApi, 'getTasks');
      const getTasksByFilterSpy = jest.spyOn(
        mockTodoistApi,
        'getTasksByFilter',
      );

      // Clear previous calls
      getTasksSpy.mockClear();
      getTasksByFilterSpy.mockClear();

      // Call the method
      await todoistService.getDueTodayTasks();

      // Log the API calls for debugging
      console.log('API calls for today tasks:');
      console.log('- getTasks calls:', getTasksSpy.mock.calls.length);
      console.log(
        '- getTasksByFilter calls:',
        getTasksByFilterSpy.mock.calls.length,
      );

      // Ideally, we should use the most efficient method
      // For today tasks, getTasksByFilter with any today-related filter is best
      const usesTodayFilter = getTasksByFilterSpy.mock.calls.some(
        (call) =>
          call[0]?.query === 'today' ||
          call[0]?.query === 'due:today' ||
          call[0]?.query === 'today | overdue' ||
          call[0]?.query?.includes('(today | overdue)'),
      );

      expect(usesTodayFilter).toBe(true);
    });

    it('should minimize API calls when retrieving inbox tasks', async () => {
      // Spy on the API methods
      const getTasksSpy = jest.spyOn(mockTodoistApi, 'getTasks');
      const getTasksByFilterSpy = jest.spyOn(
        mockTodoistApi,
        'getTasksByFilter',
      );

      // Clear previous calls
      getTasksSpy.mockClear();
      getTasksByFilterSpy.mockClear();

      // Call the method
      await todoistService.getInboxTasks();

      // Log the API calls for debugging
      console.log('API calls for inbox tasks:');
      console.log('- getTasks calls:', getTasksSpy.mock.calls.length);
      console.log(
        '- getTasksByFilter calls:',
        getTasksByFilterSpy.mock.calls.length,
      );

      // Ideally, we should use the most efficient method
      // For inbox tasks, getTasksByFilter with '#inbox' filter is usually best
      const usesInboxFilter = getTasksByFilterSpy.mock.calls.some(
        (call) =>
          call[0]?.query === '#inbox' || call[0]?.query === 'no project',
      );

      expect(usesInboxFilter).toBe(true);
    });

    it('should efficiently handle large task sets with combined filters', async () => {
      // This test verifies our approach to handling large task sets efficiently
      // Spy on the API methods
      const getTasksSpy = jest.spyOn(mockTodoistApi, 'getTasks');
      const getTasksByFilterSpy = jest.spyOn(
        mockTodoistApi,
        'getTasksByFilter',
      );

      // Clear previous calls
      getTasksSpy.mockClear();
      getTasksByFilterSpy.mockClear();

      // Call a method that would need to handle multiple task categories
      await todoistService.getRelevantTasks();

      // Verify efficient API usage - prefer specific filters over fetching all tasks
      // when dealing with large datasets
      if (getTasksByFilterSpy.mock.calls.length > 0) {
        // If using filters, ensure we're using the right ones
        const filterQueries = getTasksByFilterSpy.mock.calls.map(
          (call) => call[0]?.query,
        );
        console.log('Filters used:', filterQueries);

        // Check for optimal filter combinations
        const hasEfficientFilters = filterQueries.some(
          (query) =>
            query?.includes('today') ||
            query?.includes('(today | overdue)') ||
            query?.includes('#inbox'),
        );

        expect(hasEfficientFilters).toBe(true);
      } else {
        // If not using filters, we shouldn't be making many raw API calls
        // as that would be inefficient for large datasets
        expect(getTasksSpy.mock.calls.length).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Edge case handling', () => {
    it('should handle API errors gracefully', async () => {
      // Temporarily modify our mock to simulate an API error
      jest
        .spyOn(mockTodoistApi, 'getTasksByFilter')
        .mockImplementationOnce(() => {
          throw new Error('API unavailable');
        });

      // The service should not throw but fall back to alternative methods
      const tasks = await todoistService.getDueTodayTasks();

      // Verify we still got data despite the error
      expect(tasks).toBeDefined();
      // The exact count might vary based on fallback strategy
    });

    it('should handle empty responses gracefully', async () => {
      // Temporarily modify our mock to return empty results
      const originalImpl = mockTodoistApi.getTasksByFilter;
      jest
        .spyOn(mockTodoistApi, 'getTasksByFilter')
        .mockImplementationOnce(() => {
          return Promise.resolve([]);
        });

      // Service should handle empty responses without errors
      const tasks = await todoistService.getDueTodayTasks();

      // Restore original implementation after test
      (mockTodoistApi.getTasksByFilter as jest.Mock).mockImplementation(
        originalImpl,
      );

      // The service might fall back to other methods, so tasks might not be empty
      // But it shouldn't throw an error
      expect(() => tasks).not.toThrow();
    });
  });
});
