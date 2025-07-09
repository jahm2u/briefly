import { CalendarEvent } from '../../../lib/core/models/calendar-event.model';

describe('CalendarEvent Model', () => {
  describe('constructor', () => {
    it('should create a calendar event with all properties', () => {
      const startTime = new Date('2023-01-01T09:00:00');
      const endTime = new Date('2023-01-01T10:00:00');

      const event = new CalendarEvent({
        id: 'event123',
        summary: 'Team Meeting',
        description: 'Weekly team sync',
        location: 'Conference Room',
        startTime,
        endTime,
        isAllDay: false,
      });

      expect(event.id).toBe('event123');
      expect(event.summary).toBe('Team Meeting');
      expect(event.description).toBe('Weekly team sync');
      expect(event.location).toBe('Conference Room');
      expect(event.startTime).toBe(startTime);
      expect(event.endTime).toBe(endTime);
      expect(event.isAllDay).toBe(false);
    });

    it('should create a calendar event with default values', () => {
      const startTime = new Date('2023-01-01T09:00:00');
      const endTime = new Date('2023-01-01T10:00:00');

      const event = new CalendarEvent({
        id: 'event123',
        summary: 'Team Meeting',
        startTime,
        endTime,
      });

      expect(event.id).toBe('event123');
      expect(event.summary).toBe('Team Meeting');
      expect(event.description).toBeNull();
      expect(event.location).toBeNull();
      expect(event.startTime).toBe(startTime);
      expect(event.endTime).toBe(endTime);
      expect(event.isAllDay).toBe(false);
    });

    it('should create an immutable calendar event object', () => {
      const startTime = new Date('2023-01-01T09:00:00');
      const endTime = new Date('2023-01-01T10:00:00');

      const event = new CalendarEvent({
        id: 'event123',
        summary: 'Team Meeting',
        startTime,
        endTime,
      });

      // TypeScript should prevent direct property assignment
      // This is a runtime check to ensure immutability
      expect(() => {
        // @ts-expect-error - Testing immutability
        event.summary = 'Modified Meeting';
      }).toThrow();
    });
  });

  describe('formatTimeRange', () => {
    it('should format time range for non-all-day events', () => {
      const startTime = new Date('2023-01-01T09:00:00');
      const endTime = new Date('2023-01-01T10:30:00');

      const event = new CalendarEvent({
        id: 'event123',
        summary: 'Team Meeting',
        startTime,
        endTime,
      });

      expect(event.formatTimeRange()).toBe('09:00–10:30');
    });

    it('should handle all-day events', () => {
      const startTime = new Date('2023-01-01T00:00:00');
      const endTime = new Date('2023-01-01T23:59:59');

      const event = new CalendarEvent({
        id: 'event123',
        summary: 'Company Holiday',
        startTime,
        endTime,
        isAllDay: true,
      });

      expect(event.formatTimeRange()).toBe('All day');
    });
  });

  describe('formatForMessage', () => {
    it('should format event for message display', () => {
      const startTime = new Date('2023-01-01T14:00:00');
      const endTime = new Date('2023-01-01T15:00:00');

      const event = new CalendarEvent({
        id: 'event123',
        summary: 'Strategic Roadmap Discussion',
        location: 'Conference Room A',
        startTime,
        endTime,
      });

      expect(event.formatForMessage()).toBe(
        '14:00–15:00 | Strategic Roadmap Discussion',
      );
    });

    it('should include location when available', () => {
      const startTime = new Date('2023-01-01T09:00:00');
      const endTime = new Date('2023-01-01T09:30:00');

      const event = new CalendarEvent({
        id: 'event123',
        summary: 'Team Daily Standup',
        location: 'Conference Room',
        startTime,
        endTime,
      });

      expect(event.formatForMessage(true)).toBe(
        '09:00–09:30 | Team Daily Standup (Conference Room)',
      );
    });
  });

  describe('createFrom', () => {
    it('should create a CalendarEvent from an iCal event', () => {
      const iCalEvent = {
        uid: 'event123',
        summary: 'Team Meeting',
        description: 'Weekly team sync',
        location: 'Conference Room',
        start: new Date('2023-01-01T09:00:00'),
        end: new Date('2023-01-01T10:00:00'),
        datetype: 'date-time', // Not all-day
      };

      const event = CalendarEvent.createFrom(iCalEvent);

      expect(event.id).toBe('event123');
      expect(event.summary).toBe('Team Meeting');
      expect(event.description).toBe('Weekly team sync');
      expect(event.location).toBe('Conference Room');
      expect(event.startTime).toEqual(new Date('2023-01-01T09:00:00'));
      expect(event.endTime).toEqual(new Date('2023-01-01T10:00:00'));
      expect(event.isAllDay).toBe(false);
    });

    it('should handle all-day events', () => {
      const iCalEvent = {
        uid: 'event123',
        summary: 'Company Holiday',
        start: new Date('2023-01-01'),
        end: new Date('2023-01-02'), // End date is exclusive in iCal
        datetype: 'date', // All-day
      };

      const event = CalendarEvent.createFrom(iCalEvent);

      expect(event.id).toBe('event123');
      expect(event.summary).toBe('Company Holiday');
      expect(event.isAllDay).toBe(true);
    });
  });
});
