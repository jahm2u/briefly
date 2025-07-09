/**
 * Health Controller
 * Provides endpoints for checking system health and API integrations
 */
import { Controller, Get } from '@nestjs/common';
import { ApiValidatorUtil } from '../utils/api-validator.util';

@Controller('health')
export class HealthController {
  constructor(private readonly apiValidator: ApiValidatorUtil) {}

  /**
   * Basic health check endpoint
   * @returns Health status of the API
   */
  @Get()
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.ENVIRONMENT || 'development',
    };
  }

  /**
   * Todoist API integration health check
   * @returns Status of Todoist API integration
   */
  @Get('todoist')
  async getTodoistHealth() {
    const validation = await this.apiValidator.validateTodoistToken();

    return {
      service: 'todoist',
      status: validation.isValid ? 'ok' : 'error',
      message: validation.message,
      timestamp: new Date().toISOString(),
      details: validation.details,
    };
  }
}
