# API Endpoints Reference

## Base URL
- **Development**: `http://localhost:5100`
- **Production**: Server-specific (deployed via Docker)

## Health & Status

### GET /api/health
Health check endpoint for monitoring and load balancers.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-07-09T13:50:20.151Z",
  "uptime": 3600.123
}
```

**Status Codes:**
- `200` - Service healthy
- `503` - Service unavailable

## Message Triggers

### POST /api/messages/morning
Manually trigger the morning message workflow.

**Request Body:** None required

**Response:**
```json
{
  "success": true,
  "message": "Morning message sent successfully",
  "timestamp": "2025-07-09T07:00:00.000Z"
}
```

**Workflow:**
1. Fetches calendar events for today
2. Retrieves new tasks since yesterday
3. Groups existing tasks by category
4. Composes and sends Telegram message

### POST /api/messages/afternoon
Manually trigger the afternoon progress update.

**Request Body:** None required

**Response:**
```json
{
  "success": true,
  "message": "Afternoon message sent successfully",
  "timestamp": "2025-07-09T15:30:00.000Z"
}
```

**Workflow:**
1. Identifies completed tasks since morning
2. Fetches new inbox tasks
3. Groups remaining tasks
4. Generates motivational message
5. Sends formatted update via Telegram

### POST /api/messages/evening
Manually trigger the evening inbox triage reminder.

**Request Body:** None required

**Response:**
```json
{
  "success": true,
  "message": "Evening message sent successfully",
  "timestamp": "2025-07-09T20:00:00.000Z"
}
```

**Workflow:**
1. Fetches all inbox tasks
2. Groups tasks for triage
3. Sends reminder via Telegram

## Claude Integration

### POST /api/claude-telegram/webhook
Webhook endpoint for Telegram bot integration (internal use).

**Request Body:**
```json
{
  "message": {
    "chat": {
      "id": 287608912
    },
    "text": "/claude change the afternoon time to 2pm"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Command processed"
}
```

**Note:** This endpoint is used internally by the Telegram bot and not intended for direct API calls.

## Error Responses

### Standard Error Format
```json
{
  "success": false,
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Todoist API connection failed",
    "timestamp": "2025-07-09T13:50:20.151Z"
  }
}
```

### Common Error Codes
- `INVALID_REQUEST` - Malformed request data
- `SERVICE_UNAVAILABLE` - External service unreachable
- `AUTHENTICATION_FAILED` - API key invalid
- `RATE_LIMITED` - Too many requests
- `INTERNAL_ERROR` - Unexpected server error

## Authentication

### Current Implementation
- **Type**: None (internal API)
- **Security**: Network-level restrictions
- **Access**: Single-user application

### Future Considerations
- **API Keys**: For multi-user scenarios
- **JWT Tokens**: For session management
- **Rate Limiting**: Per-user request limits

## Rate Limiting

### Current Limits
- **None enforced**: Single-user application
- **Natural Throttling**: External API limits (Todoist, Telegram)

### Telegram Limits
- **Messages**: 30 messages per second
- **Size**: 4096 characters per message
- **Handling**: Automatic chunking and delays

### External API Limits
- **Todoist**: 450 requests per 15 minutes
- **OpenAI**: Model-specific rate limits
- **Telegram**: Bot API rate limits

## Request/Response Examples

### Successful Morning Message
```bash
curl -X POST http://localhost:5100/api/messages/morning
```

**Response:**
```json
{
  "success": true,
  "message": "Morning message sent successfully",
  "data": {
    "eventsCount": 3,
    "newTasksCount": 5,
    "groupedTasksCount": 12,
    "sentAt": "2025-07-09T07:00:00.000Z"
  }
}
```

### Error Response
```bash
curl -X POST http://localhost:5100/api/messages/afternoon
```

**Response (503):**
```json
{
  "success": false,
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Todoist API connection failed: timeout after 5000ms",
    "timestamp": "2025-07-09T15:30:00.000Z"
  }
}
```

## Monitoring & Debugging

### Health Check Usage
```bash
# Basic health check
curl http://localhost:5100/api/health

# With verbose output
curl -v http://localhost:5100/api/health
```

### Response Time Monitoring
- **Typical**: < 200ms for health checks
- **Messages**: 2-5 seconds (depends on external APIs)
- **Claude Commands**: 30-60 seconds (depends on complexity)

### Log Correlation
Each request generates structured logs with:
- **Request ID**: For tracing
- **Timestamp**: ISO 8601 format
- **Service**: Source component
- **Level**: INFO, WARN, ERROR

## Development Notes

### Local Testing
```bash
# Start development server
cd api && npm run start:dev

# Test endpoints
curl http://localhost:5100/api/health
curl -X POST http://localhost:5100/api/messages/morning
```

### Environment Variables Required
- `TODOIST_API_TOKEN`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `OPENAI_API_KEY`
- `ICAL_URLS`

### Common Issues
1. **503 Errors**: Check external API connectivity
2. **Empty Responses**: Verify environment variables
3. **Timeout Errors**: External service performance issues
4. **Telegram Failures**: Check bot token and chat ID