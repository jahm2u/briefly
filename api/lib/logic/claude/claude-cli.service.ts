import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { CommandSelection } from './claude-command-selector.service';

const execAsync = promisify(exec);

export interface ClaudeResponse {
  type: 'confirmation' | 'information' | 'error' | 'success';
  message: string;
  needsConfirmation?: boolean;
  metadata?: {
    command: string;
    branch?: string;
    pr?: string;
  };
}

@Injectable()
export class ClaudeCliService {
  private readonly claudeDir = path.join(process.cwd(), '.claude');
  private readonly commandsDir = path.join(this.claudeDir, 'commands');

  async executeCommand(
    selection: CommandSelection,
    userRequest: string,
    conversationHistory: string[] = [],
  ): Promise<ClaudeResponse> {
    try {
      // Load the appropriate command template
      const templatePath = path.join(
        this.commandsDir,
        `${selection.command}_t.md`,
      );
      let template = await fs.readFile(templatePath, 'utf-8');

      // Replace $ARGUMENTS with the actual request
      template = template.replace('# $ARGUMENTS', userRequest);

      // Create a temporary file for the command
      const tempFile = path.join(this.claudeDir, `temp_${Date.now()}.md`);
      await fs.writeFile(tempFile, template);

      // Execute Claude CLI with the template
      const claudeCommand = `cd ${process.cwd()} && claude --file ${tempFile}`;

      console.log(`Executing Claude CLI: ${claudeCommand}`);

      const { stdout, stderr } = await execAsync(claudeCommand, {
        timeout: 300000, // 5 minutes
        maxBuffer: 10 * 1024 * 1024, // 10MB
      });

      // Clean up temp file
      await fs.unlink(tempFile).catch(() => {});

      // Parse Claude's response and extract important information
      const response = await this.parseClaudeResponse(
        stdout,
        stderr,
        selection.command,
      );

      return response;
    } catch (error) {
      console.error('Error executing Claude CLI:', error);
      return {
        type: 'error',
        message: `Failed to execute Claude CLI: ${error.message}`,
        metadata: {
          command: selection.command,
        },
      };
    }
  }

  private async parseClaudeResponse(
    stdout: string,
    stderr: string,
    command: string,
  ): Promise<ClaudeResponse> {
    // Check for errors first
    if (stderr && stderr.trim()) {
      return {
        type: 'error',
        message: `Claude CLI error: ${stderr.trim()}`,
        metadata: { command },
      };
    }

    // Look for confirmation requests
    const confirmationPatterns = [
      /would you like me to/i,
      /should i proceed/i,
      /do you want me to/i,
      /confirm/i,
      /please approve/i,
      /review.*and confirm/i,
    ];

    const needsConfirmation = confirmationPatterns.some((pattern) =>
      pattern.test(stdout),
    );

    if (needsConfirmation) {
      return {
        type: 'confirmation',
        message: this.extractConfirmationMessage(stdout),
        needsConfirmation: true,
        metadata: { command },
      };
    }

    // Look for successful completion indicators
    const successPatterns = [
      /✅/,
      /successfully/i,
      /completed/i,
      /created.*issue/i,
      /pull request.*created/i,
      /deployed/i,
    ];

    const isSuccess = successPatterns.some((pattern) => pattern.test(stdout));

    if (isSuccess) {
      return {
        type: 'success',
        message: this.extractSuccessMessage(stdout),
        metadata: {
          command,
          ...this.extractMetadata(stdout),
        },
      };
    }

    // Default to information response
    return {
      type: 'information',
      message: this.extractInformationMessage(stdout),
      metadata: { command },
    };
  }

  private extractConfirmationMessage(output: string): string {
    // Extract the confirmation question from Claude's output
    const lines = output.split('\n');
    const confirmationLines = lines.filter(
      (line) =>
        line.includes('?') ||
        line.toLowerCase().includes('confirm') ||
        line.toLowerCase().includes('approve'),
    );

    return confirmationLines.length > 0
      ? confirmationLines.join('\n').trim()
      : 'Please confirm to proceed.';
  }

  private extractSuccessMessage(output: string): string {
    // Extract success message and any important details
    const lines = output.split('\n');
    const successLines = lines.filter(
      (line) =>
        line.includes('✅') ||
        line.toLowerCase().includes('success') ||
        line.toLowerCase().includes('completed') ||
        line.toLowerCase().includes('created'),
    );

    return successLines.length > 0
      ? successLines.join('\n').trim()
      : 'Operation completed successfully.';
  }

  private extractInformationMessage(output: string): string {
    // Extract relevant information, filtering out verbose output
    const lines = output.split('\n');
    const importantLines = lines.filter((line) => {
      const trimmed = line.trim();
      return (
        trimmed.length > 0 &&
        !trimmed.startsWith('[') && // Filter out log messages
        !trimmed.startsWith('npm') && // Filter out npm output
        !trimmed.startsWith('git') && // Filter out git output
        !trimmed.includes('Loading') && // Filter out loading messages
        !trimmed.includes('Analyzing')
      ); // Filter out analysis messages
    });

    return importantLines.length > 0
      ? importantLines.slice(0, 10).join('\n').trim() // Limit to first 10 important lines
      : 'Processing your request...';
  }

  private extractMetadata(output: string): any {
    const metadata: any = {};

    // Extract branch name
    const branchMatch = output.match(/branch[\s:]+([^\s\n]+)/i);
    if (branchMatch) {
      metadata.branch = branchMatch[1];
    }

    // Extract PR URL
    const prMatch = output.match(/https:\/\/github\.com\/[^\s]+\/pull\/\d+/);
    if (prMatch) {
      metadata.pr = prMatch[0];
    }

    return metadata;
  }

  async sendConfirmation(
    confirm: boolean,
    context?: any,
  ): Promise<ClaudeResponse> {
    try {
      // Handle confirmation response
      const response = confirm ? 'yes' : 'no';

      // This would typically continue the Claude CLI conversation
      // For now, we'll simulate the continuation

      if (confirm) {
        return {
          type: 'success',
          message: 'Confirmed. Proceeding with the operation...',
          metadata: context,
        };
      } else {
        return {
          type: 'information',
          message: 'Operation cancelled.',
          metadata: context,
        };
      }
    } catch (error) {
      return {
        type: 'error',
        message: `Failed to process confirmation: ${error.message}`,
      };
    }
  }
}
