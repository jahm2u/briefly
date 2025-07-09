import { Injectable } from '@nestjs/common';
import { ConfigService } from '../../core/services/config.service';
import OpenAI from 'openai';

export interface CommandSelection {
  command: 'plan' | 'work';
  confidence: number;
  reasoning: string;
  extractedRequest: string;
}

@Injectable()
export class ClaudeCommandSelectorService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.getOpenAiApiKey(),
    });
  }

  async selectCommand(userMessage: string): Promise<CommandSelection> {
    const prompt = `You are a command selector for a development assistant. Based on the user's message, determine whether they want to:

1. "plan" - Create a new GitHub issue, plan a feature, or discuss requirements
2. "work" - Work on an existing issue, implement code changes, or fix bugs

User message: "${userMessage}"

Respond with a JSON object containing:
- command: "plan" or "work"
- confidence: number from 0-100 representing how confident you are
- reasoning: brief explanation of your choice
- extractedRequest: the core request extracted from the user's message

Examples:
- "I need to add a new feature for user authentication" -> "plan"
- "Fix the bug in the login form" -> "work"
- "Can you work on issue #123?" -> "work"
- "I have an idea for improving the dashboard" -> "plan"
- "The tests are failing, please investigate" -> "work"

Be decisive but explain your reasoning.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: userMessage },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const response = completion.choices[0].message.content;
      const parsed = JSON.parse(response || '{}') as CommandSelection;

      // Validate the response
      if (!parsed.command || !['plan', 'work'].includes(parsed.command)) {
        throw new Error('Invalid command selection');
      }

      return parsed;
    } catch (error) {
      console.error('Error selecting command:', error);
      // Default to 'work' if selection fails
      return {
        command: 'work',
        confidence: 50,
        reasoning: 'Command selection failed, defaulting to work',
        extractedRequest: userMessage,
      };
    }
  }
}
