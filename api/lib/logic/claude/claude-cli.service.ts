import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

export interface ClaudeResponse {
  type: 'confirmation' | 'information' | 'error' | 'success';
  message: string;
  needsConfirmation?: boolean;
  metadata?: {
    command: string;
    branch?: string;
    pr?: string;
    issue?: string;
    commit?: string;
    sessionId?: string;
    totalCost?: number;
    numTurns?: number;
  };
}

@Injectable()
export class ClaudeCliService {

  async executeCommand(
    userRequest: string,
  ): Promise<ClaudeResponse> {
    try {
      // Execute Claude CLI directly with the user request (flags first, query last)
      const claudeCommand = `cd ${path.join(process.cwd(), '..')} && claude -p --output-format json --max-turns 5 "${userRequest}"`;

      console.log(`[Claude] Executing: ${claudeCommand}`);
      console.log(`[Claude] Starting execution at: ${new Date().toISOString()}`);

      const { stdout, stderr } = await execAsync(claudeCommand, {
        timeout: 300000, // 5 minutes timeout 
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large outputs
        killSignal: 'SIGTERM',
      });

      console.log(`[Claude] Execution completed at: ${new Date().toISOString()}`);
      console.log(`[Claude] Raw stdout (${stdout.length} chars):`, stdout);
      console.log(`[Claude] Raw stderr:`, stderr);

      // Parse Claude's response and extract important information
      const response = await this.parseClaudeResponse(
        stdout,
        stderr,
        'direct',
      );

      return response;
    } catch (error) {
      console.error('[Claude] Error executing Claude CLI:', error);
      return {
        type: 'error',
        message: `Failed to execute Claude CLI: ${error.message}`,
        metadata: {
          command: 'direct',
        },
      };
    }
  }

  private async parseClaudeResponse(
    stdout: string,
    stderr: string,
    command: string,
  ): Promise<ClaudeResponse> {
    console.log(`[Claude] Raw stdout length: ${stdout.length}`);
    console.log(`[Claude] Raw stderr: ${stderr}`);
    
    // Check for errors first
    if (stderr && stderr.trim()) {
      return {
        type: 'error',
        message: `Claude CLI error: ${stderr.trim()}`,
        metadata: { command },
      };
    }

    // Try to parse JSON output first (from --output-format json)
    try {
      const jsonOutput = JSON.parse(stdout);
      if (jsonOutput.content) {
        return this.parseStructuredResponse(jsonOutput.content, command);
      }
    } catch (e) {
      // Not JSON, continue with text parsing
      console.log('[Claude] Output not in JSON format, parsing as text');
    }

    // Look for confirmation requests
    const confirmationPatterns = [
      /would you like me to/i,
      /should i proceed/i,
      /do you want me to/i,
      /confirm/i,
      /please approve/i,
      /review.*and confirm/i,
      /permission.*required/i,
      /allow.*to/i,
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
      /committed/i,
      /pushed/i,
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

  private parseStructuredResponse(content: string, command: string): ClaudeResponse {
    // Parse structured JSON response from Claude CLI
    const confirmationPatterns = [
      /would you like me to/i,
      /should i proceed/i,
      /do you want me to/i,
      /confirm/i,
      /please approve/i,
      /review.*and confirm/i,
      /permission.*required/i,
    ];

    const needsConfirmation = confirmationPatterns.some((pattern) =>
      pattern.test(content),
    );

    if (needsConfirmation) {
      return {
        type: 'confirmation',
        message: this.extractConfirmationMessage(content),
        needsConfirmation: true,
        metadata: { command },
      };
    }

    const successPatterns = [
      /✅/,
      /successfully/i,
      /completed/i,
      /created.*issue/i,
      /pull request.*created/i,
      /deployed/i,
      /committed/i,
    ];

    const isSuccess = successPatterns.some((pattern) => pattern.test(content));

    if (isSuccess) {
      return {
        type: 'success',
        message: this.extractSuccessMessage(content),
        metadata: {
          command,
          ...this.extractMetadata(content),
        },
      };
    }

    return {
      type: 'information',
      message: this.extractInformationMessage(content),
      metadata: { command },
    };
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

    // Extract issue URLs
    const issueMatch = output.match(/https:\/\/github\.com\/[^\s]+\/issues\/\d+/);
    if (issueMatch) {
      metadata.issue = issueMatch[0];
    }

    // Extract commit hashes
    const commitMatch = output.match(/([a-f0-9]{7,40})/);
    if (commitMatch) {
      metadata.commit = commitMatch[1];
    }

    return metadata;
  }

  async sendConfirmation(
    confirm: boolean,
    context?: any,
  ): Promise<ClaudeResponse> {
    try {
      const response = confirm ? 'yes' : 'no';
      console.log(`[Claude] Sending confirmation: ${response}`);

      // For now, return a simple response since we're using acceptEdits mode
      if (confirm) {
        return {
          type: 'success',
          message: 'Confirmed. Changes will be applied automatically.',
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
      console.error('[Claude] Confirmation error:', error);
      return {
        type: 'error',
        message: `Failed to process confirmation: ${error.message}`,
        metadata: context,
      };
    }
  }
}
