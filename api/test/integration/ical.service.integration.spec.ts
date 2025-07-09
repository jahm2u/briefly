import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { ICalService } from '../../lib/core/services/ical.service';
import { ConfigService } from '../../lib/core/services/config.service';
import { CalendarEvent } from '../../lib/core/models/calendar-event.model';

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

// Mock iCal data for testing
const mockICalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:event1
DTSTART:20230115T090000Z
DTEND:20230115T093000Z
SUMMARY:Team Daily Standup
DESCRIPTION:Daily team sync meeting
LOCATION:Conference Room A
END:VEVENT
BEGIN:VEVENT
UID:event2
DTSTART:20230115T140000Z
DTEND:20230115T150000Z
SUMMARY:Strategic Roadmap Discussion
DESCRIPTION:Quarterly planning meeting
LOCATION:Conference Room B
END:VEVENT
BEGIN:VEVENT
UID:event3
DTSTART:20230116T000000Z
DTEND:20230117T000000Z
SUMMARY:Company Holiday
END:VEVENT
BEGIN:VEVENT
UID:event4
DTSTART:20230115T110000Z
DTEND:20230115T120000Z
SUMMARY:Client Meeting
DESCRIPTION:Discussing project requirements
LOCATION:Client Office
END:VEVENT
END:VCALENDAR`;

describe('ICalService Integration', () => {
  let icalService: ICalService;

  beforeEach(async () => {
    // Create a testing module with actual ConfigService
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
        }),
      ],
      providers: [ConfigService, ICalService],
    }).compile();

    icalService = module.get<ICalService>(ICalService);

    // Reset mocks between tests
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(icalService).toBeDefined();
  });

  describe('getTodayEvents', () => {
    it('should fetch and filter events for today', async () => {
      // Mock current date as 2023-01-15
      const mockDate = new Date('2023-01-15T12:00:00Z');
      jest.useFakeTimers().setSystemTime(mockDate);

      // Mock successful fetch
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockICalData),
      });

      // Mock ical.js parsing
      const mockVEvent1 = {
        getFirstPropertyValue: jest.fn((prop) => {
          if (prop === 'uid') return 'event1';
          if (prop === 'summary') return 'Team Daily Standup';
          if (prop === 'dtstart')
            return {
              toJSDate: () => new Date('2023-01-15T09:00:00Z'),
              isDate: false,
            };
          if (prop === 'dtend')
            return { toJSDate: () => new Date('2023-01-15T09:30:00Z') };
          if (prop === 'description') return 'Daily team sync meeting';
          if (prop === 'location') return 'Conference Room A';
          return null;
        }),
        hasProperty: jest.fn(() => false),
      };

      const mockVEvent2 = {
        getFirstPropertyValue: jest.fn((prop) => {
          if (prop === 'uid') return 'event2';
          if (prop === 'summary') return 'Strategic Roadmap Discussion';
          if (prop === 'dtstart')
            return {
              toJSDate: () => new Date('2023-01-15T14:00:00Z'),
              isDate: false,
            };
          if (prop === 'dtend')
            return { toJSDate: () => new Date('2023-01-15T15:00:00Z') };
          if (prop === 'description') return 'Quarterly planning meeting';
          if (prop === 'location') return 'Conference Room B';
          return null;
        }),
        hasProperty: jest.fn(() => false),
      };

      const mockComponent = {
        getAllSubcomponents: jest.fn(() => [mockVEvent1, mockVEvent2]),
      };

      mockICAL.parse.mockReturnValue(['vcalendar', [], []]);
      mockICAL.Component.mockReturnValue(mockComponent);

      const todayEvents = await icalService.getTodayEvents();

      // Verify fetch was called with the URL from config
      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/test-calendar.ics',
      );

      // Should get events for today
      expect(todayEvents).toHaveLength(2);

      // Events should be sorted by start time
      if (todayEvents.length > 1) {
        for (let i = 0; i < todayEvents.length - 1; i++) {
          expect(todayEvents[i].startTime.getTime()).toBeLessThanOrEqual(
            todayEvents[i + 1].startTime.getTime(),
          );
        }
      }

      // Verify content of first event
      expect(todayEvents[0].summary).toBe('Team Daily Standup');
      // Don't test exact time formatting as it depends on timezone
      expect(todayEvents[0].formatTimeRange()).toMatch(
        /\d{2}:\d{2}–\d{2}:\d{2}/,
      );

      // Reset timer mocks
      jest.useRealTimers();
    });

    it('should handle errors from the iCal service gracefully', async () => {
      // Mock fetch to fail
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      // When fetch fails, the service should return an empty array and log the errors
      // Access the logger from the service and spy on its error method
      const loggerErrorSpy = jest
        .spyOn((icalService as any).logger, 'error')
        .mockImplementation(() => {});

      const result = await icalService.getTodayEvents();
      expect(result).toEqual([]);
      expect(loggerErrorSpy).toHaveBeenCalled();

      // Restore the logger implementation
      loggerErrorSpy.mockRestore();
    });
  });

  describe('Calendar event formatting', () => {
    it('should correctly format events for display in messages', async () => {
      // Mock current date as 2023-01-15
      const mockDate = new Date('2023-01-15T12:00:00Z');
      jest.useFakeTimers().setSystemTime(mockDate);

      // Instead of relying on the mocked data from ical.js, let's create our own events
      // to ensure we have complete control over the test data
      const manualEvents = [
        CalendarEvent.createFrom({
          summary: 'Team Daily Standup',
          start: new Date('2023-01-15T09:00:00Z'),
          end: new Date('2023-01-15T09:30:00Z'),
          location: 'Conference Room A',
        }),
        CalendarEvent.createFrom({
          summary: 'Strategic Roadmap Discussion',
          start: new Date('2023-01-15T14:00:00Z'),
          end: new Date('2023-01-15T15:00:00Z'),
          location: 'Meeting Room B',
        }),
      ];

      // Check formatting of events directly using our manually created events
      const formattedEvents = manualEvents.map((event) =>
        event.formatForMessage(),
      );

      // Don't check for exact time strings since they depend on timezone
      // Instead check that each event contains the expected meeting name
      expect(
        formattedEvents.some((e) => e.includes('Team Daily Standup')),
      ).toBe(true);
      expect(
        formattedEvents.some((e) => e.includes('Strategic Roadmap Discussion')),
      ).toBe(true);

      // Check formatting with location
      const formattedEventsWithLocation = manualEvents.map((event) =>
        event.formatForMessage(true),
      );

      // Don't check for exact time strings, just check that location information is included
      expect(
        formattedEventsWithLocation.some(
          (e) =>
            e.includes('Team Daily Standup') && e.includes('Conference Room A'),
        ),
      ).toBe(true);

      // Reset timer mocks
      jest.useRealTimers();
    });
  });
});
