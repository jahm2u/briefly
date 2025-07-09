# Application Architecture

## Overview

Briefly is a NestJS application following clean architecture principles, designed to provide intelligent task management through automated messaging and Claude CLI integration.

## Directory Structure

```
/api/lib/
├── core/                    # Infrastructure Layer
│   ├── config/             # Configuration management
│   ├── services/           # External service integrations
│   ├── models/             # Domain models
│   ├── controllers/        # HTTP endpoints
│   └── modules/            # Feature modules
└── logic/                  # Business Logic Layer
    ├── grouping/           # GPT-based task grouping
    ├── messaging/          # Message composition
    └── claude/             # Claude CLI integration
```

## Clean Architecture Layers

### Infrastructure Layer (`/core/`)
Handles external concerns and technical implementations:
- **Services**: Todoist, Telegram, iCal, OpenAI integrations
- **Controllers**: HTTP endpoint handling
- **Modules**: Dependency injection and service wiring
- **Models**: Data transfer objects and domain entities

### Business Logic Layer (`/logic/`)
Contains domain-specific business rules:
- **Grouping**: Intelligent task categorization using GPT
- **Messaging**: Contextual message composition
- **Claude**: AI-powered development assistance

## Key Integration Points

### 1. Todoist Integration
- **Service**: `TodoistService` (`todoist.service.ts`)
- **Adapter**: `TodoistAdapter` for API response handling
- **Features**: Task fetching, filtering, deeplink generation
- **Labels**: Project-based organization and filtering

### 2. Telegram Bot
- **Service**: `TelegramService` (`telegram.service.ts`)
- **Library**: `node-telegram-bot-api`
- **Commands**: `/morning`, `/afternoon`, `/evening`, `/claude`
- **Features**: Message chunking, Markdown formatting, inline keyboards

### 3. OpenAI GPT Integration
- **Services**: `GroupingService`, `MessagingService`
- **Model**: `gpt-4o-mini`
- **Features**: Task grouping, motivational messaging, structured output
- **Optimization**: Temperature and token limits for consistent results

### 4. iCal Integration
- **Service**: `ICalService` (`ical.service.ts`)
- **Parser**: Custom iCal parsing with timezone handling
- **Features**: Event extraction, recurring event support, date filtering

### 5. Claude CLI Integration
- **Service**: `ClaudeCliService` (`claude-cli.service.ts`)
- **Execution**: Direct command execution with JSON output
- **Features**: File editing, git workflow, automated responses

## Scheduled Jobs

### SchedulerService
- **Morning (7:00 AM)**: Tasks + Calendar events overview
- **Afternoon (3:30 PM)**: Progress recap and remaining tasks
- **Evening (8:00 PM)**: Inbox triage reminder

### Job Flow
1. **Trigger**: Cron schedule or manual command
2. **Data Collection**: Fetch from Todoist, iCal services
3. **Processing**: Group tasks, compose messages
4. **Delivery**: Send via Telegram with formatting

## API Endpoints

### Health & Status
- `GET /api/health` - Application health check
- Returns service status and basic metrics

### Message Triggers
- `POST /api/messages/morning` - Trigger morning message
- `POST /api/messages/afternoon` - Trigger afternoon message  
- `POST /api/messages/evening` - Trigger evening message

### Claude Integration
- `POST /api/claude-telegram/webhook` - Telegram webhook for Claude commands

## Configuration Management

### Environment Variables
Single `.env` file in root directory:
```env
TODOIST_API_TOKEN=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
OPENAI_API_KEY=
ICAL_URLS=url1,url2,url3
```

### ConfigService
- **Location**: `/core/services/config.service.ts`
- **Features**: Type-safe configuration access, validation
- **Environment**: Development vs production mode detection

## Data Flow

### Morning Message Flow
1. **Scheduler** triggers morning job
2. **ICalService** fetches calendar events
3. **TodoistService** fetches new and existing tasks
4. **GroupingService** categorizes tasks using GPT
5. **MessagingService** composes final message
6. **TelegramService** delivers formatted message

### Claude Command Flow
1. **User** sends `/claude <request>` via Telegram
2. **TelegramService** validates and processes request
3. **ClaudeCliService** executes Claude CLI command
4. **Response** parsed and formatted for Telegram
5. **TelegramService** delivers response with appropriate styling

## Testing Strategy

### Unit Tests
- **Location**: Adjacent to source files (`*.spec.ts`)
- **Scope**: Individual service methods and business logic
- **Mocking**: External dependencies mocked

### Integration Tests
- **Location**: `/test/integration/`
- **Scope**: Service-to-service communication
- **Real APIs**: Uses actual HTTP calls where appropriate

### End-to-End Tests
- **Location**: `/test/e2e/`
- **Scope**: Full application workflows
- **Environment**: Isolated test environment

## Deployment Architecture

### Docker
- **File**: `/api/Dockerfile`
- **Strategy**: Multi-stage build for production optimization
- **Base**: Node.js Alpine for minimal footprint

### Docker Compose
- **File**: `/docker-compose.yml`
- **Services**: Single service for simplified deployment
- **Port**: 5100 (configurable)
- **Environment**: Production-ready configuration

### Process Management
- **PM2**: Process manager for production
- **Scaling**: Single instance with restart policies
- **Logging**: Structured logging for debugging

## Security Considerations

### API Keys
- **Storage**: Environment variables only
- **Access**: ConfigService with validation
- **Rotation**: Manual process (documented)

### Telegram
- **Authentication**: Bot token validation
- **Chat Restriction**: Single chat ID configuration
- **Rate Limiting**: Natural throttling through single user

### Claude CLI
- **Permissions**: Controlled via CLAUDE.md configuration
- **File Access**: Limited to project directories
- **Git Operations**: Feature branch workflow with PR review

## Performance Optimizations

### Message Chunking
- **Telegram Limits**: 4096 character limit per message
- **Implementation**: Smart chunking preserving Markdown
- **Delays**: Rate limiting between message chunks

### Caching
- **Task Data**: In-memory caching for repeated requests
- **Configuration**: Environment-based cache invalidation
- **Calendar**: Event caching with TTL

### Resource Management
- **Memory**: Bounded conversation history
- **Connections**: Connection pooling for HTTP clients
- **Timeouts**: Aggressive timeouts for external services

## Monitoring & Debugging

### Logging
- **Level**: Configurable (development vs production)
- **Format**: Structured logging with context
- **Outputs**: Console (development), files (production)

### Health Checks
- **Endpoint**: `/api/health`
- **Services**: External service connectivity validation
- **Metrics**: Basic performance indicators

### Error Handling
- **Strategy**: Fail-fast with graceful degradation
- **Recovery**: Automatic retries for transient failures
- **Alerting**: Console logging with error classification