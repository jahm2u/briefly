/**
 * Mock for Telegraf
 * Used in tests to simulate the Telegram bot without making actual API calls
 */

/**
 * Mock Telegraf implementation
 */
export class MockTelegraf {
  // Mock methods for Telegraf instance
  launch = jest.fn().mockImplementation(() => Promise.resolve());
  stop = jest.fn().mockImplementation(() => Promise.resolve());

  // Mock Telegram API methods
  telegram = {
    sendMessage: jest.fn().mockImplementation(() => Promise.resolve()),
  };
}
