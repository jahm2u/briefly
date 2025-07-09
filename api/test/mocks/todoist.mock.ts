/**
 * Mock for Todoist API responses
 * Used in tests to simulate Todoist API without making actual API calls
 */

/**
 * Mock Todoist task data structure
 */
export interface MockTodoistTask {
  id: string;
  content: string;
  project_id: string | null;
  is_completed: boolean;
  url: string;
  created_at: string;
  completed_at?: string;
}

/**
 * Mock for active tasks
 */
export const mockActiveTasks: MockTodoistTask[] = [
  {
    id: '1',
    content: 'Review product feedback',
    project_id: 'project1',
    is_completed: false,
    url: 'https://todoist.com/task/1',
    created_at: '2023-01-01T10:00:00.000Z',
  },
  {
    id: '2',
    content: 'Update weekly report',
    project_id: 'project1',
    is_completed: false,
    url: 'https://todoist.com/task/2',
    created_at: '2023-01-01T11:00:00.000Z',
  },
  {
    id: '3',
    content: 'Contact client about invoice',
    project_id: null, // In inbox
    is_completed: false,
    url: 'https://todoist.com/task/3',
    created_at: '2023-01-01T12:00:00.000Z',
  },
  {
    id: '4',
    content: 'Prepare presentation for tomorrow',
    project_id: 'project2',
    is_completed: false,
    url: 'https://todoist.com/task/4',
    created_at: '2023-01-02T09:00:00.000Z',
  },
  {
    id: '5',
    content: 'Follow up with marketing team',
    project_id: null, // In inbox
    is_completed: false,
    url: 'https://todoist.com/task/5',
    created_at: '2023-01-02T10:00:00.000Z',
  },
];

/**
 * Mock for completed tasks
 */
export const mockCompletedTasks: MockTodoistTask[] = [
  {
    id: '6',
    content: 'Set up team meeting',
    project_id: 'project1',
    is_completed: true,
    url: 'https://todoist.com/task/6',
    created_at: '2023-01-01T09:00:00.000Z',
    completed_at: '2023-01-02T14:00:00.000Z',
  },
  {
    id: '7',
    content: 'Review pull request',
    project_id: 'project2',
    is_completed: true,
    url: 'https://todoist.com/task/7',
    created_at: '2023-01-01T13:00:00.000Z',
    completed_at: '2023-01-02T15:30:00.000Z',
  },
];

/**
 * Mock TodoistApi implementation
 */
export class MockTodoistApi {
  /**
   * Mock implementation of getTasks
   */
  async getTasks(): Promise<MockTodoistTask[]> {
    return [...mockActiveTasks];
  }

  /**
   * Mock implementation of getCompletedTasks
   */
  async getCompletedTasks(args: { since: string }): Promise<MockTodoistTask[]> {
    const sinceDate = new Date(args.since);
    return mockCompletedTasks.filter((task) => {
      const completedDate = new Date(task.completed_at!);
      return completedDate >= sinceDate;
    });
  }
}
