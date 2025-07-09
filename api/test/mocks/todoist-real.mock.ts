/**
 * Enhanced Todoist mock data that simulates real-world user data
 * This simulates the scenario where a user has:
 * - 37 tasks in today view
 * - 42 tasks in inbox
 */

// Import the base interface and extend it
import { MockTodoistTask as BaseMockTodoistTask } from './todoist.mock';

// Extend the MockTodoistTask interface to include due property
export interface MockTodoistTask extends BaseMockTodoistTask {
  due?: {
    date: string;
    // Add other due properties as needed
  };
}

// Helper to generate multiple similar tasks
const generateTasks = (
  count: number,
  baseConfig: Partial<MockTodoistTask>,
  startId = 100,
): MockTodoistTask[] => {
  return Array.from({ length: count }).map((_, index) => ({
    id: `${startId + index}`,
    content: `${baseConfig.content || 'Task'} ${index + 1}`,
    project_id: baseConfig.project_id || null,
    is_completed: baseConfig.is_completed || false,
    url: `https://todoist.com/task/${startId + index}`,
    created_at: new Date().toISOString(),
    ...(baseConfig.completed_at
      ? { completed_at: baseConfig.completed_at }
      : {}),
    ...(baseConfig.due ? { due: baseConfig.due } : {}),
  }));
};

// Generate Today Tasks (37 total)
// Some due today in projects, some due today in inbox
export const mockTodayTasks: MockTodoistTask[] = [
  // 25 work tasks due today
  ...generateTasks(
    25,
    {
      content: 'Work task due today',
      project_id: 'work',
      due: { date: new Date().toISOString().split('T')[0] },
    },
    100,
  ),

  // 7 personal tasks due today
  ...generateTasks(
    7,
    {
      content: 'Personal task due today',
      project_id: 'personal',
      due: { date: new Date().toISOString().split('T')[0] },
    },
    200,
  ),

  // 5 inbox tasks due today
  ...generateTasks(
    5,
    {
      content: 'Inbox task due today',
      project_id: null,
      due: { date: new Date().toISOString().split('T')[0] },
    },
    300,
  ),
];

// Generate Inbox Tasks (42 total)
// Some with due dates, some without
export const mockInboxTasks: MockTodoistTask[] = [
  // 5 inbox tasks that are also due today (already counted in mockTodayTasks)
  ...mockTodayTasks.filter((task) => task.project_id === null),

  // 37 more inbox tasks with no due date to reach total of 42
  ...generateTasks(
    37,
    {
      content: 'Inbox task no date',
      project_id: null,
      due: undefined, // Use undefined instead of null
    },
    400,
  ),
];

// Generate All Tasks (combining all types of tasks)
export const mockAllTasks: MockTodoistTask[] = [
  // Today tasks from projects
  ...mockTodayTasks.filter((task) => task.project_id !== null),

  // All inbox tasks
  ...mockInboxTasks,

  // Other tasks (not due today, not in inbox)
  ...generateTasks(
    15,
    {
      content: 'Future task',
      project_id: 'work',
      due: {
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
      },
    },
    500,
  ),

  ...generateTasks(
    10,
    {
      content: 'Personal future task',
      project_id: 'personal',
      due: {
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
      },
    },
    600,
  ),
];

// Mock implementations for Todoist API methods with filter support
export class EnhancedMockTodoistApi {
  async getTasks(args?: any): Promise<MockTodoistTask[]> {
    // If projectId is specified, filter by project
    if (args && args.projectId) {
      return mockAllTasks.filter((task) => task.project_id === args.projectId);
    }

    // Default: return all tasks
    return mockAllTasks;
  }

  async getTasksByFilter(args: {
    query: string;
    limit?: number;
  }): Promise<MockTodoistTask[]> {
    const { query, limit = 200 } = args;
    let filteredTasks: MockTodoistTask[] = [];

    console.log(`Mock API: getTasksByFilter called with query: '${query}'`);

    // Handle different filter queries
    // First, handle the exact patterns that would come from the tests
    if (query === 'today | overdue' || query.includes('(today | overdue)')) {
      console.log(
        'Mock API: Detected combined filter with parentheses or OR operator',
      );
      // Return all today tasks for the combined filter (37 tasks as expected by tests)
      filteredTasks = mockTodayTasks;
    } else if (query === 'today' || query === 'due:today') {
      console.log('Mock API: Returning today tasks');
      filteredTasks = mockTodayTasks;
    } else if (query === '#inbox' || query === 'no project') {
      console.log('Mock API: Returning inbox tasks');
      filteredTasks = mockInboxTasks;
    } else if (query.includes('overdue')) {
      console.log('Mock API: Detected overdue query');
      // For test purposes, we'll return a subset of today tasks as overdue
      // Make sure some of these are also inbox tasks to satisfy intersection test
      const overdueTasks = [
        ...mockTodayTasks
          .filter((task) => task.project_id === null)
          .slice(0, 5), // 5 inbox tasks that are overdue
        ...mockTodayTasks
          .filter((task) => task.project_id !== null)
          .slice(0, 10), // 10 non-inbox overdue tasks
      ];
      filteredTasks = overdueTasks;
    } else if (query.includes('#')) {
      // Extract project name from filter (e.g., #Work)
      const projectName = query.split('#')[1].split(' ')[0].toLowerCase();
      console.log(`Mock API: Filtering by project: ${projectName}`);
      filteredTasks = mockAllTasks.filter(
        (task) =>
          task.project_id && task.project_id.toLowerCase() === projectName,
      );
    } else {
      console.log('Mock API: No specific filter matched, returning all tasks');
      // Default: return all tasks
      filteredTasks = mockAllTasks;
    }

    console.log(
      `Mock API: Returning ${filteredTasks.length} tasks for query '${query}'`,
    );
    // Apply limit
    return filteredTasks.slice(0, limit);
  }
}
