/**
 * Mock for iCal responses
 * Used in tests to simulate iCal data without making actual HTTP requests
 */

/**
 * Mock iCal event data structure
 */
export interface MockICalEvent {
  type: string;
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  datetype: 'date-time' | 'date'; // 'date' for all-day events
}

/**
 * Mock iCal data with multiple events
 */
export const mockICalData: Record<string, MockICalEvent> = {
  event1: {
    type: 'VEVENT',
    uid: 'event1',
    summary: 'Team Daily Standup',
    description: 'Daily team sync meeting',
    location: 'Conference Room A',
    start: new Date('2023-01-15T09:00:00Z'),
    end: new Date('2023-01-15T09:30:00Z'),
    datetype: 'date-time',
  },
  event2: {
    type: 'VEVENT',
    uid: 'event2',
    summary: 'Strategic Roadmap Discussion',
    description: 'Quarterly planning meeting',
    location: 'Conference Room B',
    start: new Date('2023-01-15T14:00:00Z'),
    end: new Date('2023-01-15T15:00:00Z'),
    datetype: 'date-time',
  },
  event3: {
    type: 'VEVENT',
    uid: 'event3',
    summary: 'Company Holiday',
    start: new Date('2023-01-16T00:00:00Z'),
    end: new Date('2023-01-17T00:00:00Z'),
    datetype: 'date', // All-day event
  },
  event4: {
    type: 'VEVENT',
    uid: 'event4',
    summary: 'Client Meeting',
    description: 'Discussing project requirements',
    location: 'Client Office',
    start: new Date('2023-01-15T11:00:00Z'),
    end: new Date('2023-01-15T12:00:00Z'),
    datetype: 'date-time',
  },
  // Non-event items that should be filtered out
  timezone: {
    type: 'VTIMEZONE',
    uid: 'timezone',
    summary: '',
    start: new Date(),
    end: new Date(),
    datetype: 'date-time',
  },
};

/**
 * Mock node-ical implementation
 */
export const mockNodeIcal = {
  /**
   * Mock implementation of fromURL
   */
  fromURL: jest.fn().mockImplementation((url: string) => {
    // Simulate successful response
    return Promise.resolve(mockICalData);
  }),
};
