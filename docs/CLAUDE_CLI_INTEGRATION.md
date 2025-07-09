# Claude CLI Integration 🤖

## Overview

The Briefly API integrates with Claude CLI to provide intelligent code assistance through Telegram. Users can send requests via `/claude` command and receive automated responses with file editing, git workflow management, and more.

## Integration Architecture

### Telegram Bot Handler
- **Location**: `/api/lib/core/services/telegram.service.ts`
- **Command**: `/claude <request>`
- **Handler**: Processes user requests and routes to Claude CLI service

### Claude CLI Service
- **Location**: `/api/lib/logic/claude/claude-cli.service.ts`
- **Purpose**: Executes Claude CLI commands and parses responses
- **Output**: Structured responses with type classification

## How It Works

1. **User Input**: `/claude change the afternoon push time to 2pm`
2. **Processing**: Telegram bot receives and validates request
3. **Execution**: Claude CLI runs: `claude "change the afternoon push time to 2pm" -p --output-format json --max-turns 5 --dangerously-skip-permissions`
4. **Response**: Parsed JSON output sent back to Telegram with formatting

## Command Structure

### Direct Execution (Current Implementation)
```bash
claude "<user_request>" -p --output-format json --max-turns 5 --dangerously-skip-permissions
```

### Flags Explained
- `-p`: Print mode (non-interactive)
- `--output-format json`: Structured JSON output for parsing
- `--max-turns 5`: Limit conversation turns to prevent hanging
- `--dangerously-skip-permissions`: Skip permission prompts for automation

## Response Types

### ClaudeResponse Interface
```typescript
interface ClaudeResponse {
  type: 'confirmation' | 'information' | 'error' | 'success';
  message: string;
  needsConfirmation?: boolean;
  metadata?: {
    command: string;
    branch?: string;
    pr?: string;
    issue?: string;
    commit?: string;
  };
}
```

### Response Classification
- **confirmation**: Claude needs user approval
- **success**: Operation completed successfully
- **error**: Something went wrong
- **information**: General status update

## Error Handling

### Timeout Management
- **Timeout**: 60 seconds (1 minute)
- **Kill Signal**: SIGTERM for graceful termination
- **Fallback**: Error response with timeout message

### Permission Handling
- **Skip Prompts**: Uses `--dangerously-skip-permissions`
- **Automation**: Prevents hanging on permission requests
- **Security**: Relies on CLAUDE.md file permissions

## Telegram Integration

### Message Flow
1. User sends `/claude` command
2. Bot validates request and services
3. Shows "Processing..." message
4. Executes Claude CLI command
5. Parses and formats response
6. Sends formatted response with appropriate styling

### Message Formatting
- **Success**: ✅ with green styling
- **Error**: ❌ with red styling
- **Info**: ℹ️ with blue styling
- **Confirmation**: ⚠️ with inline keyboard (Yes/No)

### Conversation History
- **Storage**: In-memory Map per chat ID
- **Limit**: Last 10 messages per conversation
- **Purpose**: Context for follow-up requests

## Configuration

### Module Setup
- **Service**: Injected into TelegramService via MessagesModule
- **Dependencies**: None (simplified from previous command selector approach)
- **Initialization**: Automatic when MessagesModule loads

### Environment Requirements
- Claude CLI must be installed and authenticated on server
- Telegram bot token and chat ID configured
- Git repository access for file operations

## Debugging

### Logging
```typescript
console.log(`[Claude] Executing: ${claudeCommand}`);
console.log(`[Claude] Starting execution at: ${new Date().toISOString()}`);
console.log(`[Claude] Execution completed at: ${new Date().toISOString()}`);
console.log(`[Claude] Raw stdout (${stdout.length} chars):`, stdout);
console.log(`[Claude] Raw stderr:`, stderr);
```

### Common Issues
1. **Timeout**: Command taking longer than 60 seconds
2. **Authentication**: Claude CLI not properly authenticated
3. **Permissions**: File system or git access issues
4. **Parsing**: Invalid JSON response from Claude CLI

## Evolution Notes

### Previous Implementation
- Used command selection AI to choose between `plan_t` and `work_t` templates
- Complex template system with file management
- Slash command routing (`/work_t`, `/plan_t`)

### Current Simplified Approach
- Direct user request execution
- No template complexity
- Simpler error handling
- More reliable execution

## Future Enhancements

### Potential Improvements
1. **Session Management**: Proper conversation continuity with `--continue` flag
2. **Stream Processing**: Real-time output using `--output-format stream-json`
3. **Permission Management**: More granular control over file operations
4. **Response Streaming**: Live updates during long operations

### Integration Opportunities
1. **GitHub Issues**: Automatic issue creation from failed operations
2. **Monitoring**: Integration with application health monitoring
3. **Analytics**: Usage tracking and optimization insights