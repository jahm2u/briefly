/**
 * Mock for OpenAI API responses
 * Used in tests to simulate OpenAI API without making actual API calls
 */

/**
 * Mock for OpenAI chat completion response
 */
export interface MockOpenAIChatCompletion {
  choices: {
    message: {
      content: string;
    };
  }[];
}

/**
 * Mock responses for task grouping
 */
export const mockTaskGroupingResponse: MockOpenAIChatCompletion = {
  choices: [
    {
      message: {
        content: JSON.stringify({
          Product: [
            'Review product feedback [View Task](https://todoist.com/task/1)',
          ],
          Reporting: [
            'Update weekly report [View Task](https://todoist.com/task/2)',
            'Prepare presentation for tomorrow [View Task](https://todoist.com/task/4)',
          ],
          Client: [
            'Contact client about invoice [View Task](https://todoist.com/task/3)',
          ],
          Communication: [
            'Follow up with marketing team [View Task](https://todoist.com/task/5)',
          ],
        }),
      },
    },
  ],
};

/**
 * Mock response for inbox task grouping
 */
export const mockInboxGroupingResponse: MockOpenAIChatCompletion = {
  choices: [
    {
      message: {
        content: JSON.stringify({
          'Client Work': [
            'Contact client about invoice [View Task](https://todoist.com/task/3)',
          ],
          'Team Communication': [
            'Follow up with marketing team [View Task](https://todoist.com/task/5)',
          ],
        }),
      },
    },
  ],
};

/**
 * Mock response for motivation message
 */
export const mockMotivationResponse: MockOpenAIChatCompletion = {
  choices: [
    {
      message: {
        content:
          "Great job completing your tasks! You're making excellent progress today.",
      },
    },
  ],
};

/**
 * Mock OpenAI implementation
 */
export class MockOpenAI {
  chat = {
    completions: {
      create: jest.fn().mockImplementation((args: any) => {
        // Return different responses based on the prompt content
        const promptContent =
          args.messages.find((m: any) => m.role === 'user')?.content || '';

        if (promptContent.includes('Completed tasks:')) {
          return Promise.resolve(mockMotivationResponse);
        } else if (promptContent.includes('inbox')) {
          return Promise.resolve(mockInboxGroupingResponse);
        } else {
          return Promise.resolve(mockTaskGroupingResponse);
        }
      }),
    },
  };
}
