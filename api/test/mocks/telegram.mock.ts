/**
 * Mock for Telegram Bot API
 * Used in tests to simulate Telegram interactions without making actual API calls
 */

/**
 * Mock Telegraf implementation
 */
export class MockTelegraf {
  /**
   * Mocked telegram API methods
   */
  telegram = {
    /**
     * Mock for sending messages
     */
    sendMessage: jest
      .fn()
      .mockImplementation((chatId: string, message: string, options: any) => {
        return Promise.resolve({
          message_id: Math.floor(Math.random() * 1000),
          chat: {
            id: chatId,
            type: 'private',
          },
          date: Math.floor(Date.now() / 1000),
          text: message,
        });
      }),
  };

  /**
   * Mock for bot.launch()
   */
  launch = jest.fn().mockImplementation(() => {
    return Promise.resolve();
  });

  /**
   * Mock for bot.stop()
   */
  stop = jest.fn().mockImplementation(() => {
    return Promise.resolve();
  });
}
