/**
 * Represents a calendar event from iCal with its properties
 * Implements an immutable data structure
 */
export class CalendarEvent {
  readonly id: string;
  readonly summary: string;
  readonly description: string | null;
  readonly location: string | null;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly isAllDay: boolean;

  /**
   * Creates a new immutable CalendarEvent instance
   */
  constructor(props: {
    id: string;
    summary: string;
    description?: string | null;
    location?: string | null;
    startTime: Date;
    endTime: Date;
    isAllDay?: boolean;
  }) {
    this.id = props.id;
    this.summary = props.summary;
    this.description = props.description ?? null;
    this.location = props.location ?? null;
    this.startTime = props.startTime;
    this.endTime = props.endTime;
    this.isAllDay = props.isAllDay ?? false;

    // Make the object immutable
    Object.freeze(this);
  }

  /**
   * Formats the event time range for display
   */
  formatTimeRange(): string {
    if (this.isAllDay) {
      return 'All day';
    }

    const formatHourMinute = (date: Date): string => {
      return date.toLocaleTimeString('en-US', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    };

    return `${formatHourMinute(this.startTime)}–${formatHourMinute(this.endTime)}`;
  }

  /**
   * Formats the event for message display
   * @param includeLocation Whether to include the location in the formatted output
   */
  formatForMessage(includeLocation = false): string {
    const timeRange = this.formatTimeRange();
    const base = `${timeRange} | ${this.summary}`;

    if (includeLocation && this.location) {
      return `${base} (${this.location})`;
    }

    return base;
  }

  /**
   * Factory method to create a CalendarEvent from an iCal event
   */
  static createFrom(iCalEvent: any): CalendarEvent {
    const isAllDay = iCalEvent.datetype === 'date';

    return new CalendarEvent({
      id: iCalEvent.uid,
      summary: iCalEvent.summary,
      description: iCalEvent.description || null,
      location: iCalEvent.location || null,
      startTime: iCalEvent.start,
      endTime: iCalEvent.end,
      isAllDay,
    });
  }
}
