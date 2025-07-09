# Briefly: Todoist-iCal-AI Integration

A productivity bot that sends concise, structured daily summaries via Telegram, integrating Todoist tasks and iCal calendar events. Tasks are intelligently grouped using gpt-4.1-mini without modifying their original texts.

## Features

- **3 Daily Messages**: Morning (7am), Afternoon (post-meeting), Evening (8pm)
- **Todoist Integration**: Tasks with clickable deeplinks
- **iCal Integration**: Calendar events display
- **gpt-4.1-mini Integration**: Intelligent task grouping and motivational messages
- **Telegram Bot**: Delivery of formatted messages

## Architecture

Built with NestJS following clean architecture principles:

```
/lib
  /core
    /config             # API keys, environment configs
    /utils              # Utility helpers
    /services           # Todoist, iCal, Telegram integrations
    /models             # Task and calendar data models
    /exceptions         # Custom error handling
  /logic
    /grouping           # GPT logic for task grouping
    /messaging          # GPT prompt logic for Telegram messaging
/test
  /unit
  /integration
  /mocks
```

## Prerequisites

- Node.js v16 or later
- Todoist account with API token
- Telegram bot token (from BotFather)
- OpenAI API key for gpt-4.1-mini
- iCal URLs for calendar integration

## Environment Setup

### Environment File Organization

This project follows the single source of truth principle for environment variables:

- All environment variables are stored in a **single `.env` file** in the root directory
- The Docker container mounts this file from the root directory
- No duplicate `.env` files should exist in subdirectories
- The Dockerfile does not contain hardcoded environment variables

This approach ensures clean architecture principles are followed and simplifies configuration management.

### Setting Up Your Environment

1. Copy `.env.example` to `.env` in the root directory:
   ```bash
   cp .env.example .env
   ```

2. Fill in your API keys and tokens:
   ```
   # Todoist API Configuration
   TODOIST_API_TOKEN=your_todoist_personal_api_token_here

   # Telegram Bot Configuration
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
   TELEGRAM_CHAT_ID=your_telegram_chat_id_here

   # OpenAI GPT Integration
   OPENAI_API_KEY=your_openai_api_key_here

   # iCal Integration
   ICAL_URLS=https://calendar1.ics,https://calendar2.ics

   # Security
   ENCRYPTION_KEY=32_character_random_string_for_AES256

   # App Configuration
   ENVIRONMENT=production
   ```

## Installation

```bash
# Install dependencies
npm install

# Build the application
npm run build
```

## Running the Application

### Standard Method

```bash
# Development mode
npm run start:dev

# Production mode
npm run start:prod
```

### Docker Method

```bash
# Build and start the Docker container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

The Docker container runs on port 5100 by default. You can access the API at `http://localhost:5100/api`.

### Docker Configuration

The application is configured to run in a Docker container with the following features:

- Alpine-based Node.js image for minimal size
- Multi-stage build for optimized production image
- Environment variables injected from .env file
- Health check endpoint for container monitoring
- Volume mounting for easy configuration updates

## Testing

```bash
# Run all tests
npm run test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run test coverage
npm run test:cov
```

## Triggering Messages Manually

The application has API endpoints to manually trigger messages:

- `POST /api/messages/morning`: Triggers the morning message
- `POST /api/messages/afternoon`: Triggers the afternoon message
- `POST /api/messages/evening`: Triggers the evening message

Example:
```bash
curl -X POST http://localhost:3000/api/messages/morning
```

## License

MIT
