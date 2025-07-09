import { Injectable } from '@nestjs/common';
import { ConfigService } from '../../core/services/config.service';
import { Task } from '../../core/models/task.model';
import OpenAI from 'openai';

/**
 * Service for grouping tasks using GPT
 */
@Injectable()
export class GroupingService {
  private openaiClient: OpenAI;

  constructor(private readonly configService: ConfigService) {
    // Initialize OpenAI client - this makes it easier to mock in tests
    this.initializeOpenAI();
  }

  /**
   * Initialize the OpenAI client - separated to make it testable
   */
  private initializeOpenAI(): void {
    this.openaiClient = new OpenAI({
      apiKey: this.configService.getOpenAiApiKey(),
    });
  }

  /**
   * Groups tasks into logical categories using GPT
   */
  async groupTasks(tasks: Task[]): Promise<Record<string, Task[]>> {
    // Check if there are any tasks to group
    if (tasks.length === 0) {
      return {};
    }

    try {
      // Create a map of task content to original Task object for reconstruction later
      const taskMap = new Map<string, Task>();

      // Format the tasks as strings for GPT with unique identifiers
      const taskStrings = tasks.map((task, index) => {
        const taskString = `[TASK:${index}] ${task.content}`;
        taskMap.set(`[TASK:${index}]`, task);
        return taskString;
      });

      // Create prompt for the GPT model
      const systemPrompt = `
        You are a productivity assistant that helps organize tasks.
        Your job is to group these tasks logically into meaningful categories without changing their text.
        Do not create more than 5 categories unless absolutely necessary.
        Tasks have unique identifiers like [TASK:0], [TASK:1], etc. that must be preserved in your response.
        Respond with a JSON object where keys are category names and values are arrays of task identifiers only.
        Example: {"Work": ["[TASK:0]", "[TASK:2]"], "Personal": ["[TASK:1]", "[TASK:3]"]}
        Only respond with the JSON, nothing else.
      `;

      // Make the API request to OpenAI
      const response = await this.openaiClient.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: taskStrings.join('\n') },
        ],
        response_format: { type: 'json_object' },
      });

      // Extract and parse the response
      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('Empty response from GPT');
      }

      try {
        // Parse the GPT response
        const groupedTaskIdentifiers = JSON.parse(content) as Record<
          string,
          string[]
        >;

        // Convert task identifiers back to Task objects
        const groupedTasks: Record<string, Task[]> = {};

        for (const [category, identifiers] of Object.entries(
          groupedTaskIdentifiers,
        )) {
          groupedTasks[category] = identifiers
            .map((identifier) => {
              // Extract task ID from the identifier string
              const taskId = identifier.trim();
              return taskMap.get(taskId);
            })
            .filter((task): task is Task => task !== undefined);
        }

        return groupedTasks;
      } catch (error) {
        throw new Error(
          `Failed to parse GPT response as JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    } catch (error) {
      throw new Error(
        `Failed to group tasks with GPT: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Identifies tasks that are new since a reference date
   */
  identifyNewTasks(tasks: Task[], referenceDate: Date): Task[] {
    return tasks.filter((task) => {
      // Skip tasks without a creation date
      if (!task.createdAt) {
        return false;
      }

      // Include tasks created after the reference date
      return task.createdAt > referenceDate;
    });
  }
}
