import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TodoistService } from '../../lib/core/services/todoist.service';
import { ConfigService } from '../../lib/core/services/config.service';
import { TodoistApi } from '@doist/todoist-api-typescript';
import { mockActiveTasks } from '../mocks/todoist.mock';

// Mock TodoistApi
jest.mock('@doist/todoist-api-typescript');

describe('TodoistService Integration', () => {
  let todoistService: TodoistService;

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

    // Setup TodoistApi mock with completed tasks included in the getTasks response
    // This is needed because our implementation now filters completed tasks from the full task list
    const mockTasksWithCompleted = [
      ...mockActiveTasks,
      // Add a completed task with a timestamp after our test date
      {
        id: '7',
        content: 'Completed task after cutoff',
        project_id: 'project2',
        is_completed: true,
        url: 'https://todoist.com/task/7',
        completed_at: '2023-01-02T15:00:00.000Z', // After the test cutoff time
      },
      // Add another completed task but with a timestamp before our test date
      {
        id: '8',
        content: 'Completed task before cutoff',
        project_id: 'project2',
        is_completed: true,
        url: 'https://todoist.com/task/8',
        completed_at: '2023-01-02T14:00:00.000Z', // Before the test cutoff time
      },
    ];

    (TodoistApi as jest.Mock).mockImplementation(() => ({
      // Return all tasks including the completed ones
      getTasks: jest.fn().mockResolvedValue(mockTasksWithCompleted),
    }));
  });

  it('should be defined', () => {
    expect(todoistService).toBeDefined();
  });

  it('should initialize TodoistApi with the correct API token', () => {
    expect(TodoistApi).toHaveBeenCalledWith('test-todoist-token');
  });

  describe('getTasks', () => {
    it('should fetch and transform Todoist tasks', async () => {
      const tasks = await todoistService.getTasks();

      // We now return active and completed tasks, so the length won't match mockActiveTasks.length anymore
      // Filter out completed tasks for this test to match original expectations
      const activeTasks = tasks.filter((task) => !task.isCompleted);
      expect(activeTasks).toHaveLength(mockActiveTasks.length);
      expect(tasks[0].id).toBe(mockActiveTasks[0].id);
      expect(tasks[0].content).toBe(mockActiveTasks[0].content);
      expect(tasks[0].projectId).toBe(mockActiveTasks[0].project_id);
    });
  });

  describe('getInboxTasks', () => {
    it('should return only tasks without a project ID', async () => {
      const inboxTasks = await todoistService.getInboxTasks();

      // Count inbox tasks in mock data
      const expectedInboxTaskCount = mockActiveTasks.filter(
        (task) => task.project_id === null,
      ).length;

      expect(inboxTasks).toHaveLength(expectedInboxTaskCount);
      expect(inboxTasks.every((task) => task.isInInbox())).toBe(true);
    });
  });

  describe('getCompletedTasksSince', () => {
    it('should fetch tasks completed since the given date', async () => {
      // Set date to fetch tasks completed after this date
      const sinceDate = new Date('2023-01-02T14:30:00.000Z');

      const completedTasks =
        await todoistService.getCompletedTasksSince(sinceDate);

      // Only one task was completed after 14:30
      expect(completedTasks).toHaveLength(1);
      expect(completedTasks[0].id).toBe('7');
      expect(completedTasks[0].isCompleted).toBe(true);
    });
  });
});
