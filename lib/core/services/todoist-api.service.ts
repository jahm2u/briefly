/**
 * Todoist API Service
 * Core service for interacting with the Todoist REST API
 */
import { TodoistApi } from '@doist/todoist-api-typescript';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { Project, Task } from '@doist/todoist-api-typescript/dist/types';

// Initialize environment
dotenv.config({ path: resolve(__dirname, '../../../.env') });

// Define return types for better TypeScript support
interface ConnectionResult {
  success: boolean;
  projects?: Project[];
  message: string;
  error?: any;
}

interface TasksResult {
  success: boolean;
  tasks: Task[];
  method: string;
  count: number;
  diagnostics?: {
    projectCount: number;
    apiEndpoint: string;
    possibleIssues: string[];
  };
  error?: {
    message: string;
    status?: number;
    data?: any;
  };
}

export class TodoistApiService {
  private api: TodoistApi;
  
  constructor(apiToken?: string) {
    // Use provided token or get from environment
    const token = apiToken || process.env.TODOIST_API_TOKEN;
    
    if (!token) {
      throw new Error('Todoist API token not provided or found in environment');
    }
    
    this.api = new TodoistApi(token);
  }
  
  /**
   * Test API connectivity by fetching projects
   */
  async testConnection(): Promise<ConnectionResult> {
    try {
      const projects = await this.api.getProjects();
      return {
        success: true,
        projects,
        message: `Successfully connected to Todoist API. Found ${projects.length} projects.`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        error
      };
    }
  }
  
  /**
   * Get all projects
   */
  async getProjects(): Promise<Project[]> {
    return this.api.getProjects();
  }
  
  /**
   * Get all active tasks
   * @param projectId Optional project ID to filter by
   */
  async getTasks(projectId?: string): Promise<Task[]> {
    const options: Record<string, any> = {};
    
    if (projectId) {
      options.projectId = projectId;
    }
    
    return this.api.getTasks(options);
  }
  
  /**
   * Advanced task fetching with diagnostic information
   * Attempts multiple strategies to fetch tasks
   */
  async getTasksWithDiagnostics(): Promise<TasksResult> {
    try {
      // First try: standard method
      const tasks = await this.api.getTasks();
      
      // If tasks found, return them
      if (tasks && tasks.length > 0) {
        return {
          success: true,
          tasks,
          method: 'standard',
          count: tasks.length
        };
      }
      
      // Second try: fetch by projects
      const projects = await this.api.getProjects();
      const tasksByProject: Task[] = [];
      
      // Only proceed if we have projects
      if (projects && projects.length > 0) {
        // Fetch tasks for each project
        for (const project of projects) {
          try {
            const projectTasks = await this.api.getTasks({ projectId: project.id });
            if (projectTasks && projectTasks.length > 0) {
              tasksByProject.push(...projectTasks);
            }
          } catch (err) {
            // Continue to next project if one fails
          }
        }
      }
      
      // If found tasks by project, return them
      if (tasksByProject.length > 0) {
        return {
          success: true,
          tasks: tasksByProject,
          method: 'by-project',
          count: tasksByProject.length
        };
      }
      
      // Return diagnostic information if no tasks found
      return {
        success: false,
        tasks: [],
        method: 'all-attempted',
        count: 0,
        diagnostics: {
          projectCount: projects ? projects.length : 0,
          apiEndpoint: 'https://api.todoist.com/rest/v2/tasks',
          possibleIssues: [
            'No active tasks in Todoist account',
            'API token may not have sufficient permissions',
            'Network connectivity issues'
          ]
        }
      };
      
    } catch (error: any) {
      return {
        success: false,
        tasks: [],
        method: 'error',
        count: 0,
        error: {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        }
      };
    }
  }
}
