/**
 * Test for TodoistService with TodoistAdapter integration
 * Verifies the TodoistService correctly uses the adapter to handle API responses
 */
import { TodoistService } from '../lib/core/services/todoist.service';
import { TodoistAdapter } from '../lib/core/services/todoist-adapter';
import { ConfigService } from '../lib/core/services/config.service';
import { Task } from '../lib/core/models/task.model';

// Mock the ConfigService
class MockConfigService {
  getTodoistApiToken() {
    return 'test-token';
  }
}

// Main test function
async function testTodoistServiceWithAdapter() {
  console.log('Testing TodoistService with TodoistAdapter integration...');

  // Create instances
  const configService = new MockConfigService();
  const todoistService = new TodoistService(configService as any);

  // Create mock tasks for different scenarios
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Format dates to ISO format for due date fields
  const todayStr = today.toISOString().split('T')[0];
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Mock tasks with different project and due date scenarios
  const mockTasks = [
    // Inbox task (no project) due today
    {
      id: '1',
      content: 'Inbox Task Due Today',
      project_id: null,
      is_completed: false,
      url: null,
      due: { date: todayStr },
      deepLink: 'https://todoist.com/app/task/1',
    },
    // Task with project, due tomorrow
    {
      id: '2',
      content: 'Project Task Due Tomorrow',
      project_id: '123',
      is_completed: false,
      url: null,
      due: { date: tomorrowStr },
      deepLink: 'https://todoist.com/app/task/2',
    },
    // Overdue task with project
    {
      id: '3',
      content: 'Overdue Task',
      project_id: '123',
      is_completed: false,
      url: null,
      due: { date: yesterdayStr },
      deepLink: 'https://todoist.com/app/task/3',
    },
    // Inbox task with no due date
    {
      id: '4',
      content: 'Inbox Task No Due Date',
      project_id: null,
      is_completed: false,
      url: null,
      due: null,
      deepLink: 'https://todoist.com/app/task/4',
    },
  ];

  const mockProjects = [
    {
      id: '123',
      name: 'Project 1',
    },
  ];

  // Set up mock responses for different filter types
  const mockTasksByFilter = {
    'no project': mockTasks.filter((task) => task.project_id === null),
    '#inbox': mockTasks.filter((task) => task.project_id === null),
    today: mockTasks.filter((task) => task.due?.date === todayStr),
    overdue: mockTasks.filter((task) => task.due?.date === yesterdayStr),
    'today | overdue': mockTasks.filter(
      (task) => task.due?.date === todayStr || task.due?.date === yesterdayStr,
    ),
  };

  // Create a mock adapter with predefined responses
  const mockAdapter = {
    getProjects: async () => mockProjects,
    getTasks: async (options?: any) => {
      if (options?.filter && mockTasksByFilter[options.filter]) {
        return mockTasksByFilter[options.filter];
      }
      return mockTasks;
    },
    getTasksWithDeepLinks: async () => mockTasks,
  };

  // Replace the adapter in the service with our mock
  (todoistService as any).todoistAdapter = mockAdapter;

  try {
    // Test getTasks method
    console.log('Testing getTasks()...');
    const tasks = await todoistService.getTasks();
    console.log(`Retrieved ${tasks.length} tasks`);
    console.log('Sample task:', JSON.stringify(tasks[0], null, 2));

    // Verify task properties are correctly set
    if (tasks[0].url !== 'https://todoist.com/app/task/1') {
      throw new Error('Task URL not properly set from deepLink');
    }

    // Test getInboxTasks method (should return tasks with no project)
    console.log('\nTesting getInboxTasks()...');
    const inboxTasks = await todoistService.getInboxTasks();
    console.log(`Retrieved ${inboxTasks.length} inbox tasks`);

    // Verify inbox tasks have no project
    const allInboxTasksHaveNoProject = inboxTasks.every(
      (task) => task.projectId === null,
    );
    console.log('All inbox tasks have no project:', allInboxTasksHaveNoProject);
    if (!allInboxTasksHaveNoProject) {
      throw new Error('Inbox tasks filter returned tasks with projects');
    }

    // There should be 2 inbox tasks (ID 1 and 4)
    if (inboxTasks.length !== 2) {
      throw new Error(`Expected 2 inbox tasks, got ${inboxTasks.length}`);
    }

    // Test getDueTodayTasks method (should include both today and overdue tasks)
    console.log('\nTesting getDueTodayTasks()...');
    const dueTasks = await todoistService.getDueTodayTasks();
    console.log(`Retrieved ${dueTasks.length} due today and overdue tasks`);
    console.log('Task IDs:', dueTasks.map((t) => t.id).join(', '));

    // Should include both today's task (ID 1) and overdue task (ID 3)
    const hasTodayTask = dueTasks.some((task) => task.id === '1');
    const hasOverdueTask = dueTasks.some((task) => task.id === '3');

    console.log('Has today task:', hasTodayTask);
    console.log('Has overdue task:', hasOverdueTask);

    if (!hasTodayTask || !hasOverdueTask) {
      throw new Error(
        'Due today tasks should include both today and overdue tasks',
      );
    }

    console.log('\nAll tests completed successfully! ✅');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testTodoistServiceWithAdapter().catch(console.error);
