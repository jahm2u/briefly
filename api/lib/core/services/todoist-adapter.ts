/**
 * Todoist API Adapter
 * Handles the Todoist API response format changes
 */
import { TodoistApi } from '@doist/todoist-api-typescript';
import { Project, Task } from '@doist/todoist-api-typescript/dist/types';

export class TodoistAdapter {
  private api: TodoistApi;

  /**
   * Constructor to initialize with either a token string or an existing TodoistApi instance
   * @param apiTokenOrInstance Either a Todoist API token string or an existing TodoistApi instance
   */
  constructor(apiTokenOrInstance: string | TodoistApi | any) {
    if (typeof apiTokenOrInstance === 'string') {
      if (!apiTokenOrInstance) {
        throw new Error('Todoist API token is required');
      }
      this.api = new TodoistApi(apiTokenOrInstance);
    } else if (apiTokenOrInstance instanceof TodoistApi) {
      this.api = apiTokenOrInstance;
    } else if (apiTokenOrInstance && typeof apiTokenOrInstance === 'object') {
      // Check if it has necessary methods like a mock would have
      if (
        typeof apiTokenOrInstance.getTasks === 'function' ||
        typeof apiTokenOrInstance.getTasksByFilter === 'function'
      ) {
        // Use the mock object directly
        this.api = apiTokenOrInstance;
      } else {
        throw new Error(
          'Invalid mock object: must implement getTasks or getTasksByFilter method',
        );
      }
    } else {
      throw new Error(
        'Invalid argument: must provide either API token string or TodoistApi instance',
      );
    }
  }

  /**
   * Safely extracts array data from Todoist API responses
   * Handles both old format (direct array) and new format ({ results: [] })
   */
  private extractResults<T>(data: any): T[] {
    if (!data) return [];

    // Handle new API format that returns { results: [] }
    if (data && typeof data === 'object' && Array.isArray(data.results)) {
      return data.results;
    }

    // Handle old format that returns direct array
    if (Array.isArray(data)) {
      return data;
    }

    return [];
  }

  /**
   * Get all projects
   */
  async getProjects(): Promise<Project[]> {
    const response = await this.api.getProjects();
    return this.extractResults<Project>(response);
  }

  /**
   * Get tasks with optional filters
   */
  async getTasks(options?: Record<string, any>): Promise<Task[]> {
    // If a filter is provided, use getTasksByFilter instead of getTasks
    // This is crucial for test spies to work properly
    if (options && options.filter) {
      const response = await this.api.getTasksByFilter({
        query: options.filter,
        limit: options.limit || 200,
      });
      return this.extractResults<Task>(response);
    }

    // Set a reasonable limit for getTasks - most users won't have more than 200 active tasks
    // And we'll mostly be using filters now instead of fetching all tasks
    const requestOptions = {
      ...(options || {}),
      limit: (options && options.limit) || 200, // Use provided limit or default to 200
    };

    const response = await this.api.getTasks(requestOptions);
    return this.extractResults<Task>(response);
  }

  /**
   * Get task by ID
   */
  async getTask(taskId: string): Promise<Task | null> {
    try {
      const task = await this.api.getTask(taskId);
      return task;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all active tasks with deep links
   */
  async getTasksWithDeepLinks(): Promise<(Task & { deepLink: string })[]> {
    const tasks = await this.getTasks();

    return tasks.map((task) => ({
      ...task,
      deepLink: `https://todoist.com/app/task/${task.id}`,
    }));
  }
}
