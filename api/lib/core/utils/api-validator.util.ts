/**
 * API Validator Utility
 * Validates external API tokens and connections
 */
import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { TodoistApi } from '@doist/todoist-api-typescript';

@Injectable()
export class ApiValidatorUtil {
  constructor(private readonly configService: NestConfigService) {}

  /**
   * Validates Todoist API token by attempting to fetch projects
   * @returns Object containing validation result and diagnostic information
   */
  async validateTodoistToken(): Promise<{
    isValid: boolean;
    message: string;
    details?: any;
  }> {
    try {
      const token = this.configService.get<string>('TODOIST_API_TOKEN');

      if (!token) {
        return {
          isValid: false,
          message: 'Todoist API token is not configured',
        };
      }

      // Initialize Todoist API client
      const api = new TodoistApi(token);

      // First test: Check if we can fetch projects
      try {
        const projects = await api.getProjects();

        // Second test: Check if we can fetch tasks with basic filter
        const todayTasks = await api.getTasksByFilter({
          query: 'today',
          limit: 10,
        });

        // If we get here, the token is valid
        return {
          isValid: true,
          message: 'Todoist API token is valid and working correctly',
          details: {
            projectCount: Array.isArray(projects) ? projects.length : 'Unknown',
            taskSample: Array.isArray(todayTasks)
              ? todayTasks.length
              : todayTasks && 'items' in todayTasks
                ? (todayTasks as any).items.length
                : 'Unknown',
          },
        };
      } catch (apiError) {
        return {
          isValid: false,
          message: `Todoist API token validation failed: ${apiError.message}`,
          details: {
            error: apiError.message,
            statusCode: apiError.httpStatusCode || 'Unknown',
          },
        };
      }
    } catch (error) {
      return {
        isValid: false,
        message: `Unexpected error during Todoist token validation: ${error.message}`,
      };
    }
  }
}
