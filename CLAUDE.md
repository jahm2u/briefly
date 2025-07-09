# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

All commands should be run from the `/api` directory:

```bash
cd api

# Development
npm run start:dev          # Start with hot reload
npm run build             # Build the application
npm run start:prod        # Run production build

# Testing
npm run test:unit         # Run unit tests only
npm run test:integration  # Run integration tests only
npm run test:e2e         # Run end-to-end tests
npm run test:cov         # Run tests with coverage

# Code Quality
npm run lint             # Run ESLint with auto-fix
npm run format           # Format code with Prettier
```

## Architecture Overview

This is a NestJS application following clean architecture principles. The codebase is organized to separate business logic from infrastructure concerns:

### Directory Structure
- **`/api/lib/`** - Main application code (not `/api/src/`)
  - **`core/`** - Infrastructure layer
    - `config/` - Configuration management with NestJS ConfigModule
    - `services/` - External service integrations (Todoist, Telegram, OpenAI, iCal)
    - `models/` - Domain models (Task, CalendarEvent)
    - `controllers/` - HTTP endpoints
    - `modules/` - Feature modules (messages, claude)
  - **`logic/`** - Business logic layer
    - `grouping/` - GPT-based task grouping
    - `messaging/` - Message composition for Telegram
    - `claude/` - Claude CLI integration services

### Key Integration Points

1. **Todoist Integration** (`todoist-fixed.service.ts`)
   - Uses `TodoistAdapter` to handle API responses
   - Fetches tasks with filters and labels
   - Generates deeplinks for tasks

2. **Telegram Bot** (`telegram.service.ts`)
   - Uses Telegraf library
   - Sends formatted messages with HTML parse mode
   - Handles emoji and special formatting
   - Supports Claude CLI commands via `/claude` command

3. **OpenAI GPT** (`grouping.service.ts`, `messaging.service.ts`)
   - Task grouping without modifying original text
   - Motivational message generation
   - Uses gpt-4.1-mini model

4. **iCal Integration** (`ical.service.ts`)
   - Parses calendar URLs from environment
   - Extracts events for specified date ranges
   - Handles recurring events

5. **Claude CLI Integration** (`claude-cli.service.ts`)
   - Executes Claude CLI commands with structured templates
   - Handles command selection and response parsing
   - Manages git workflow with automatic branching and PRs

### Scheduled Jobs

The application runs three daily jobs via `SchedulerService`:
- Morning (7:00 AM): Tasks + Calendar events
- Afternoon (3:30 PM): Progress recap
- Evening (8:00 PM): Inbox triage reminder

### API Endpoints

- `GET /api/health` - Health check
- `POST /api/messages/morning` - Trigger morning message
- `POST /api/messages/afternoon` - Trigger afternoon message
- `POST /api/messages/evening` - Trigger evening message
- `POST /api/claude-telegram/webhook` - Telegram webhook for Claude CLI commands

### Environment Configuration

Single `.env` file in root directory with:
- `TODOIST_API_TOKEN`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `OPENAI_API_KEY`
- `ICAL_URLS` (comma-separated)

### Testing Strategy

- **Unit tests**: Test individual services and models in isolation
- **Integration tests**: Test external API integrations with real HTTP calls
- **Mocks**: Comprehensive mocks for all external services in `/test/mocks/`
- Tests use Jest with TypeScript support

### Docker Deployment

- Multi-stage Dockerfile in `/api/`
- Single docker-compose.yml for production deployment
- Start: `docker-compose up -d`
- Stop: `docker-compose down`
- Runs on port 5100

## Claude CLI Integration

### Commands Available

- `/claude <request>` - Send a request to Claude CLI
  - Automatically selects between "plan" and "work" commands
  - Uses structured output for intelligent command selection
  - Handles confirmations and back-and-forth conversation

### Command Templates

Located in `.claude/commands/`:
- `plan_t.md` - Template for planning features and creating GitHub issues
- `work_t.md` - Template for working on existing issues and implementing code

### Git Workflow

Claude CLI is configured to:
1. **Create feature branches** for all changes
2. **Generate pull requests** instead of direct commits to main
3. **Preserve .env file** during deployments
4. **Auto-commit changes** with descriptive messages
5. **Push changes to remote** using SSH keys

### Permissions

Claude CLI has permission to:
- ✅ Read all files in the repository
- ✅ Edit files in `/api/lib/` and `/api/src/`
- ✅ Create new files as needed
- ✅ Run npm commands in `/api/` directory
- ✅ Execute git commands (branch, commit, push)
- ✅ Create pull requests via GitHub API
- ❌ Modify deployment configuration files
- ❌ Edit `.env` files directly
- ❌ Modify Docker configuration
- ❌ Change GitHub workflow files

### Safety Measures

- All changes go through pull request review
- Automatic linting and type checking before commits
- Preservation of environment configuration
- Graceful error handling with user feedback
- Rate limiting to prevent abuse

### Usage Instructions

1. **Send command via Telegram**: `/claude add user authentication feature`
2. **Claude analyzes request** and selects appropriate command template
3. **Confirmation required** for destructive operations
4. **Changes are implemented** following existing patterns
5. **Pull request created** with detailed description
6. **User receives PR link** via Telegram

## Important Instructions

### File Editing Guidelines
- **ALWAYS** preserve existing code patterns and conventions
- **NEVER** modify environment configuration files
- **ALWAYS** test changes before committing
- **NEVER** commit secrets or sensitive data
- **ALWAYS** follow TypeScript strict mode requirements

### Git Workflow
- **CREATE** feature branches for all work
- **GENERATE** pull requests instead of direct commits
- **PRESERVE** .env file during operations
- **USE** descriptive commit messages
- **REFERENCE** GitHub issues in commits

### Communication
- **CONFIRM** destructive operations with user
- **REPORT** progress and status updates
- **PROVIDE** clear error messages
- **INCLUDE** relevant context in responses
- **FILTER** verbose output to essential information

### Testing Requirements
- **RUN** `npm run lint` before committing
- **RUN** `npm run test:unit` for new features
- **VERIFY** application starts successfully
- **CHECK** no TypeScript errors
- **VALIDATE** all imports resolve correctly

This configuration enables Claude CLI to work effectively with the codebase while maintaining security and code quality standards.