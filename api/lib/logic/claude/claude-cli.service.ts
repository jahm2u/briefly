import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
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
export class ClaudeCliService implements OnModuleInit {
  private readonly logger = new Logger(ClaudeCliService.name);
  private claudeQuery: any = null;

  // NestJS will call this method once the module has been initialized
  async onModuleInit() {
    try {
      this.logger.log('Initializing Claude SDK...');
      
      // Dynamic import for ES module compatibility
      const claudeModule = await import('@anthropic-ai/claude-code');
      this.claudeQuery = claudeModule.query;
      
      this.logger.log('Claude SDK initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Claude SDK', error);
      // Don't throw - allow app to start but log the error
      // The executeCommand method will handle the case where claudeQuery is null
    }
  }

  async executeCommand(
    userRequest: string,
  ): Promise<ClaudeResponse> {
    try {
      // Check if SDK is available
      if (!this.claudeQuery) {
        this.logger.error('Claude SDK not available - falling back to CLI');
        return await this.executeWithCLI(userRequest);
      }

      console.log(`[Claude] Starting TypeScript SDK execution at: ${new Date().toISOString()}`);
      console.log(`[Claude] Request: ${userRequest}`);

      const messages: any[] = [];
      const abortController = new AbortController();

      // Set timeout for the operation
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, 300000); // 5 minutes timeout

      try {
        // Use TypeScript SDK with proper working directory
        for await (const message of this.claudeQuery({
          prompt: userRequest,
          abortController,
          options: {
            maxTurns: 5,
            cwd: path.join(process.cwd(), '..'),
            permissionMode: 'acceptEdits', // Accept file edits automatically
          },
        })) {
          messages.push(message);
          console.log(`[Claude] Received message type: ${message.type}`);
        }
      } finally {
        clearTimeout(timeoutId);
      }

      console.log(`[Claude] Execution completed at: ${new Date().toISOString()}`);
      console.log(`[Claude] Total messages received: ${messages.length}`);

      // Extract the final result
      const resultMessage = messages.find(msg => msg.type === 'result');
      if (resultMessage && 'result' in resultMessage) {
        return {
          type: 'success',
          message: resultMessage.result,
          metadata: {
            command: 'sdk',
            sessionId: resultMessage.session_id,
            totalCost: 'total_cost_usd' in resultMessage ? resultMessage.total_cost_usd : undefined,
            numTurns: 'num_turns' in resultMessage ? resultMessage.num_turns : undefined,
          },
        };
      }

      // If no result message, extract from assistant messages
      const assistantMessages = messages.filter(msg => msg.type === 'assistant');
      if (assistantMessages.length > 0) {
        const lastMessage = assistantMessages[assistantMessages.length - 1];
        const content = lastMessage.message.content;
        const textContent = Array.isArray(content) 
          ? content.filter(c => c.type === 'text').map(c => c.text).join('\n')
          : typeof content === 'string' ? content : 'Operation completed';

        return {
          type: 'information',
          message: textContent,
          metadata: {
            command: 'sdk',
            sessionId: lastMessage.session_id,
          },
        };
      }

      return {
        type: 'error',
        message: 'No response received from Claude',
        metadata: { command: 'sdk' },
      };

    } catch (error) {
      console.error('[Claude] Error executing Claude SDK:', error);
      
      if (error.name === 'AbortError') {
        return {
          type: 'error',
          message: 'Claude operation timed out after 5 minutes',
          metadata: { command: 'sdk' },
        };
      }

      // If SDK fails, fall back to CLI
      this.logger.warn('Claude SDK failed, falling back to CLI');
      return await this.executeWithCLI(userRequest);
    }
  }

  // Fallback CLI implementation with proper security
  private async executeWithCLI(userRequest: string): Promise<ClaudeResponse> {
    try {
      console.log(`[Claude] Executing CLI fallback at: ${new Date().toISOString()}`);
      
      // Use spawn instead of exec to avoid command injection
      const { spawn } = require('child_process');
      
      return new Promise((resolve, reject) => {
        const claude = spawn('claude', ['-p', '--output-format', 'json', '--max-turns', '5', userRequest], {
          cwd: path.join(process.cwd(), '..'),
          timeout: 300000, // 5 minutes
        });

        let stdout = '';
        let stderr = '';

        claude.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        claude.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        claude.on('close', (code) => {
          if (code === 0) {
            resolve(this.parseClaudeResponse(stdout, stderr, 'cli'));
          } else {
            resolve({
              type: 'error',
              message: `Claude CLI exited with code ${code}: ${stderr}`,
              metadata: { command: 'cli' },
            });
          }
        });

        claude.on('error', (error) => {
          resolve({
            type: 'error',
            message: `CLI execution failed: ${error.message}`,
            metadata: { command: 'cli' },
          });
        });
      });
    } catch (error) {
      return {
        type: 'error',
        message: `CLI fallback failed: ${error.message}`,
        metadata: { command: 'cli' },
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

      // Since we're using acceptEdits mode, confirmations are handled automatically
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
