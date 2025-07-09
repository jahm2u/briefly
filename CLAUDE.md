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
    - `modules/` - Feature modules (messages)
  - **`logic/`** - Business logic layer
    - `grouping/` - GPT-based task grouping
    - `messaging/` - Message composition for Telegram

### Key Integration Points

1. **Todoist Integration** (`todoist-fixed.service.ts`)
   - Uses `TodoistAdapter` to handle API responses
   - Fetches tasks with filters and labels
   - Generates deeplinks for tasks

2. **Telegram Bot** (`telegram.service.ts`)
   - Uses Telegraf library
   - Sends formatted messages with HTML parse mode
   - Handles emoji and special formatting

3. **OpenAI GPT** (`grouping.service.ts`, `messaging.service.ts`)
   - Task grouping without modifying original text
   - Motivational message generation
   - Uses gpt-4.1-mini model

4. **iCal Integration** (`ical.service.ts`)
   - Parses calendar URLs from environment
   - Extracts events for specified date ranges
   - Handles recurring events

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