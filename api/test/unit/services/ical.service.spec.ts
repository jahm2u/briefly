import { Test, TestingModule } from '@nestjs/testing';
import { ICalService } from '../../../lib/core/services/ical.service';
import { ConfigService } from '../../../lib/core/services/config.service';
import { CalendarEvent } from '../../../lib/core/models/calendar-event.model';

// Mock ical.js
jest.mock('ical.js', () => ({
  parse: jest.fn(),
  Component: jest.fn(),
  Time: {
    fromJSDate: jest.fn(),
  },
  RecurExpansion: jest.fn(),
}));

// Import the mocked module
const mockICAL = require('ical.js');

// Mock global fetch
global.fetch = jest.fn();

describe('ICalService', () => {
  let service: ICalService;
  let mockGetICalUrls: jest.Mock;

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create a mock for ConfigService
    mockGetICalUrls = jest
      .fn()
      .mockReturnValue(['https://example.com/calendar.ics']);
    const configServiceMock = {
      getICalUrls: mockGetICalUrls,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ICalService,
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = module.get<ICalService>(ICalService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTodayEvents', () => {
    it('should fetch and filter events for today only', async () => {
      // Create mock date for testing - use current date to avoid timezone issues
      const today = new Date();
      today.setHours(12, 0, 0, 0); // Set to noon
      jest.useFakeTimers().setSystemTime(today);

      // Create events for today and tomorrow using the same date base
      const todayStart1 = new Date(today);
      todayStart1.setHours(9, 0, 0, 0);
      const todayEnd1 = new Date(today);
      todayEnd1.setHours(10, 0, 0, 0);

      const todayStart2 = new Date(today);
      todayStart2.setHours(14, 0, 0, 0);
      const todayEnd2 = new Date(today);
      todayEnd2.setHours(15, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStart = new Date(tomorrow);
      tomorrowStart.setHours(9, 0, 0, 0);
      const tomorrowEnd = new Date(tomorrow);
      tomorrowEnd.setHours(10, 0, 0, 0);

      // Mock the fetchEvents method
      const mockEvents = [
        new CalendarEvent({
          id: 'event1',
          summary: 'Today Event 1',
          startTime: todayStart1,
          endTime: todayEnd1,
        }),
        new CalendarEvent({
          id: 'event2',
          summary: 'Today Event 2',
          startTime: todayStart2,
          endTime: todayEnd2,
        }),
        new CalendarEvent({
          id: 'event3',
          summary: 'Tomorrow Event',
          startTime: tomorrowStart,
          endTime: tomorrowEnd,
        }),
      ];

      jest.spyOn(service as any, 'fetchEvents').mockResolvedValue(mockEvents);

      const relevantEvents = await service.getTodayEvents();

      expect(service['fetchEvents']).toHaveBeenCalled();
      expect(relevantEvents).toHaveLength(2); // Only today's events are relevant
      expect(relevantEvents[0].id).toBe('event1');
      expect(relevantEvents[1].id).toBe('event2');

      // Reset timer mocks
      jest.useRealTimers();
    });

    it('should return events sorted by start time', async () => {
      // Create mock date for testing - use current date to avoid timezone issues
      const today = new Date();
      today.setHours(12, 0, 0, 0); // Set to noon
      jest.useFakeTimers().setSystemTime(today);

      // Create events using the same date base to avoid timezone issues
      const laterStart = new Date(today);
      laterStart.setHours(14, 0, 0, 0);
      const laterEnd = new Date(today);
      laterEnd.setHours(15, 0, 0, 0);

      const earlierStart = new Date(today);
      earlierStart.setHours(9, 0, 0, 0);
      const earlierEnd = new Date(today);
      earlierEnd.setHours(10, 0, 0, 0);

      // Mock the fetchEvents method with unsorted events
      const mockEvents = [
        new CalendarEvent({
          id: 'event2',
          summary: 'Later Event',
          startTime: laterStart,
          endTime: laterEnd,
        }),
        new CalendarEvent({
          id: 'event1',
          summary: 'Earlier Event',
          startTime: earlierStart,
          endTime: earlierEnd,
        }),
      ];

      jest.spyOn(service as any, 'fetchEvents').mockResolvedValue(mockEvents);

      const todayEvents = await service.getTodayEvents();

      expect(todayEvents).toHaveLength(2);
      expect(todayEvents[0].id).toBe('event1'); // Earlier event should be first
      expect(todayEvents[1].id).toBe('event2');

      // Reset timer mocks
      jest.useRealTimers();
    });

    it('should handle errors when fetching events', async () => {
      jest
        .spyOn(service as any, 'fetchEvents')
        .mockRejectedValue(new Error('Failed to fetch events'));

      await expect(service.getTodayEvents()).rejects.toThrow(
        'Failed to fetch calendar events: Failed to fetch events',
      );
    });
  });

  describe('fetchEvents', () => {
    it('should fetch events from all configured iCal URLs', async () => {
      // Mock multiple iCal URLs
      mockGetICalUrls.mockReturnValue([
        'https://example.com/calendar1.ics',
        'https://example.com/calendar2.ics',
      ]);

      // Mock successful fetch responses
      const mockICalData1 = 'BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR';
      const mockICalData2 = 'BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR';

      (global.fetch as jest.Mock).mockImplementation((url) => {
        if (url === 'https://example.com/calendar1.ics') {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockICalData1),
          });
        } else {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockICalData2),
          });
        }
      });

      // Mock ical.js parsing
      const mockVEvent1 = {
        getFirstPropertyValue: jest.fn((prop) => {
          if (prop === 'uid') return 'event1';
          if (prop === 'summary') return 'Event 1';
          if (prop === 'dtstart')
            return {
              toJSDate: () => new Date('2023-01-15T09:00:00Z'),
              isDate: false,
            };
          if (prop === 'dtend')
            return { toJSDate: () => new Date('2023-01-15T10:00:00Z') };
          return null;
        }),
        hasProperty: jest.fn(() => false),
      };

      const mockVEvent2 = {
        getFirstPropertyValue: jest.fn((prop) => {
          if (prop === 'uid') return 'event2';
          if (prop === 'summary') return 'Event 2';
          if (prop === 'dtstart')
            return {
              toJSDate: () => new Date('2023-01-15T14:00:00Z'),
              isDate: false,
            };
          if (prop === 'dtend')
            return { toJSDate: () => new Date('2023-01-15T15:00:00Z') };
          return null;
        }),
        hasProperty: jest.fn(() => false),
      };

      const mockComponent1 = {
        getAllSubcomponents: jest.fn(() => [mockVEvent1]),
      };

      const mockComponent2 = {
        getAllSubcomponents: jest.fn(() => [mockVEvent2]),
      };

      mockICAL.parse.mockReturnValue(['vcalendar', [], []]);

      // Mock Component constructor to return different components for different calls
      let componentCallCount = 0;
      mockICAL.Component.mockImplementation(() => {
        componentCallCount++;
        if (componentCallCount === 1) {
          return mockComponent1;
        } else {
          return mockComponent2;
        }
      });

      const events = await service['fetchEvents']();

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/calendar1.ics',
      );
      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/calendar2.ics',
      );

      expect(events).toHaveLength(2);
      expect(events[0]).toBeInstanceOf(CalendarEvent);
      expect(events[0].id).toBe('event1');
      expect(events[1].id).toBe('event2');
    });

    it('should handle errors from individual URLs gracefully', async () => {
      // Mock multiple iCal URLs
      mockGetICalUrls.mockReturnValue([
        'https://example.com/calendar1.ics',
        'https://example.com/error.ics',
      ]);

      // Mock fetch to succeed for first URL and fail for second
      (global.fetch as jest.Mock).mockImplementation((url) => {
        if (url === 'https://example.com/calendar1.ics') {
          return Promise.resolve({
            ok: true,
            text: () =>
              Promise.resolve('BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR'),
          });
        } else {
          return Promise.resolve({
            ok: false,
            status: 404,
            statusText: 'Not Found',
          });
        }
      });

      // Mock ical.js parsing for successful URL
      const mockVEvent = {
        getFirstPropertyValue: jest.fn((prop) => {
          if (prop === 'uid') return 'event1';
          if (prop === 'summary') return 'Event 1';
          if (prop === 'dtstart')
            return {
              toJSDate: () => new Date('2023-01-15T09:00:00Z'),
              isDate: false,
            };
          if (prop === 'dtend')
            return { toJSDate: () => new Date('2023-01-15T10:00:00Z') };
          return null;
        }),
        hasProperty: jest.fn(() => false),
      };

      const mockComponent = {
        getAllSubcomponents: jest.fn(() => [mockVEvent]),
      };

      mockICAL.parse.mockReturnValue(['vcalendar', [], []]);
      mockICAL.Component.mockReturnValue(mockComponent);

      // Service should not throw but log the error and continue
      const events = await service['fetchEvents']();

      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('event1');
    });
  });

  describe('isRelevantEvent', () => {
    it('should return true for events occurring today', () => {
      // Mock current date as 2023-01-15
      const today = new Date('2023-01-15T12:00:00Z');
      jest.useFakeTimers().setSystemTime(today);

      // Create event on the same day
      const event = new CalendarEvent({
        id: 'event1',
        summary: 'Today Event',
        startTime: new Date('2023-01-15T09:00:00Z'),
        endTime: new Date('2023-01-15T10:00:00Z'),
      });

      expect(service['isRelevantEvent'](event)).toBe(true);

      // Reset timer mocks
      jest.useRealTimers();
    });

    it('should return false for events not occurring today', () => {
      // Mock current date as 2023-01-15
      const today = new Date('2023-01-15T12:00:00Z');
      jest.useFakeTimers().setSystemTime(today);

      // Create event on a different day (far future)
      const event = new CalendarEvent({
        id: 'event1',
        summary: 'Future Event',
        startTime: new Date('2023-02-16T09:00:00Z'),
        endTime: new Date('2023-02-16T10:00:00Z'),
      });

      expect(service['isRelevantEvent'](event)).toBe(false);

      // Reset timer mocks
      jest.useRealTimers();
    });

    it('should handle all-day events correctly', () => {
      // Mock current date as 2023-01-15
      const today = new Date('2023-01-15T12:00:00Z');
      jest.useFakeTimers().setSystemTime(today);

      // Create all-day event
      const event = new CalendarEvent({
        id: 'event1',
        summary: 'All Day Event',
        startTime: new Date('2023-01-15T00:00:00Z'),
        endTime: new Date('2023-01-15T23:59:59Z'),
        isAllDay: true,
      });

      expect(service['isRelevantEvent'](event)).toBe(true);

      // Reset timer mocks
      jest.useRealTimers();
    });
  });
});
