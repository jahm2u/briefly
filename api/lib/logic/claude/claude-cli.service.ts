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
  private readonly claudeDir = path.join(process.cwd(), '..', '.claude');
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
      
      // Check if the template file exists
      try {
        await fs.access(templatePath);
      } catch (error) {
        console.error(`[Claude] Template file not found: ${templatePath}`);
        return {
          type: 'error',
          message: `Template file not found: ${selection.command}_t.md. Please ensure the .claude/commands/ directory exists in the project root with the necessary template files.`,
          metadata: {
            command: selection.command,
          },
        };
      }
      
      let template = await fs.readFile(templatePath, 'utf-8');

      // Replace $ARGUMENTS with the actual request
      template = template.replace('# $ARGUMENTS', userRequest);

      // Create a temporary file for the command
      const tempFile = path.join(this.claudeDir, `temp_${Date.now()}.md`);
      await fs.writeFile(tempFile, template);

      // Execute Claude CLI with optimized flags for automation
      const claudeCommand = `cd ${path.join(process.cwd(), '..')} && claude --file ${tempFile} -p --output-format json --max-turns 10 --verbose`;

      console.log(`[Claude] Executing: ${claudeCommand}`);

      const { stdout, stderr } = await execAsync(claudeCommand, {
        timeout: 600000, // 10 minutes for complex operations
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large outputs
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
      console.error('[Claude] Error executing Claude CLI:', error);
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
      // Continue the Claude CLI session with the confirmation response
      const response = confirm ? 'yes' : 'no';
      
      console.log(`[Claude] Sending confirmation: ${response}`);

      // Use continue flag to maintain session state
      const claudeCommand = `cd ${path.join(process.cwd(), '..')} && echo "${response}" | claude -c -p --output-format json --verbose`;
      
      const { stdout, stderr } = await execAsync(claudeCommand, {
        timeout: 600000, // 10 minutes
        maxBuffer: 50 * 1024 * 1024, // 50MB
      });

      if (stderr && stderr.trim()) {
        return {
          type: 'error',
          message: `Confirmation failed: ${stderr.trim()}`,
          metadata: context,
        };
      }

      // Parse the response
      const result = await this.parseClaudeResponse(stdout, stderr, context?.command || 'confirmation');
      
      return {
        ...result,
        metadata: { ...result.metadata, ...context },
      };
      
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
