# Todoist Integration Tests & Filter Optimization

## Action Items

- [x] 1. Research Todoist API filter syntax and options
- [x] 2. Create test suite for Todoist service
- [x] 3. Implement test cases for filter combinations
- [x] 4. Implement test for today view (target: 37 tasks)
- [x] 5. Implement test for inbox view (target: 42 tasks)
- [x] 6. Optimize TodoistService filters
- [x] 7. Implement mocks for integration tests
- [x] 8. Verify all tests pass with correct task counts
- [x] 9. Document findings and recommended filter strategies
- [x] 10. Add Telegram bot introduction message on startup
- [x] 11. Implement slash commands for triggering message routines

## Project Context

The Briefly project integrates with Todoist to display tasks in a Telegram bot. Currently, there's a discrepancy between the API results and the actual Todoist interface. The user reports having 37 tasks in today view and 42 tasks in inbox, but the API is returning 0 tasks.

## Integration Test Strategy

We'll follow the project's Clean Architecture and Single Responsibility Principle to create proper integration tests. These tests will verify that our Todoist service correctly retrieves tasks matching the user's Todoist account view.

## Telegram Bot Enhancements

We'll also implement two key usability features for the Telegram bot:

1. **Introduction Message**: The bot will introduce itself when started, explaining its purpose and available commands.

2. **Command Triggers**: Add slash commands to manually trigger the different message routines:
   - `/morning` - Trigger the morning message (tasks + calendar events)
   - `/afternoon` - Trigger the afternoon message (post-meeting updates)
   - `/evening` - Trigger the evening message (day summary)

### Testing Approach

1. Create direct API tests that try different filter combinations
2. Implement mocks for controlled testing of the service
3. Document the filters that match the user's Todoist organization
4. Update the TodoistService implementation to use these filters

### Todoist API Filters to Test

Todoist offers various filter combinations. We'll test:

- Basic filters: `today`, `overdue`, `#inbox`
- Advanced filters: `due:today`, `no project`, `(today | overdue)`
- Custom view filters that might match the user's setup

## Implementation Details

Each test will verify both the filter syntax and the expected count of tasks. We'll measure success by matching the user's reported task counts:

- Today view: 37 tasks
- Inbox: 42 tasks
