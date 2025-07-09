import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from './config.service';
import { CalendarEvent } from '../models/calendar-event.model';
import { DateTime, Interval } from 'luxon';

const ICAL = require('ical.js');

/**
 * Service for fetching and parsing iCal calendar events using ical.js
 * Properly handles recurring events and American date formats
 */
@Injectable()
export class ICalService {
  private readonly logger = new Logger(ICalService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Fetches events for today from all configured iCal sources
   */
  async getTodayEvents(): Promise<CalendarEvent[]> {
    try {
      const allEvents = await this.fetchEvents();
      this.logger.log(`Fetched ${allEvents.length} total calendar events`);

      // Log all events before filtering
      allEvents.forEach((event) => {
        this.logger.debug(
          `Event before filter: "${event.summary}" on ${event.startTime.toISOString()}`,
        );
      });

      const relevantEvents = allEvents.filter((event) =>
        this.isRelevantEvent(event),
      );
      this.logger.log(
        `After filtering: ${relevantEvents.length} events are relevant for today`,
      );

      // Sort events by start time
      return relevantEvents.sort(
        (a, b) => a.startTime.getTime() - b.startTime.getTime(),
      );
    } catch (error) {
      throw new Error(`Failed to fetch calendar events: ${error.message}`);
    }
  }

  /**
   * Fetches all events from all configured iCal sources with proper recurring event expansion
   * @private
   */
  private async fetchEvents(): Promise<CalendarEvent[]> {
    const urls = this.configService.getICalUrls();
    const events: CalendarEvent[] = [];

    // Set up date range for event expansion (30 days before to 30 days after today)
    const now = new Date();
    const rangeStart = new Date(now);
    rangeStart.setDate(now.getDate() - 30);
    const rangeEnd = new Date(now);
    rangeEnd.setDate(now.getDate() + 30);

    for (const url of urls) {
      try {
        this.logger.debug(`Fetching calendar from: ${url}`);

        // Fetch iCal data
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const icalData = await response.text();

        // Parse with ical.js
        const jcalData = ICAL.parse(icalData);
        const comp = new ICAL.Component(jcalData);

        // Process each VEVENT
        const vevents = comp.getAllSubcomponents('vevent');
        this.logger.debug(
          `Found ${vevents.length} VEVENT components in calendar`,
        );

        for (const vevent of vevents) {
          try {
            const event = new ICAL.Event(vevent);

            // Exceptions are handled by their master event's iterator.
            // We must skip them here to avoid processing them as standalone events.
            if (event.isRecurrenceException()) {
              this.logger.debug(
                `Skipping recurrence exception for UID: ${event.uid} with Recurrence-ID: ${event.recurrenceId.toString()}`,
              );
              continue;
            }

            const summary = event.summary || 'Untitled';
            this.logger.debug(`Processing event: ${summary}`);

            if (event.isRecurring()) {
              this.logger.debug(`Event "${summary}" is recurring`);
              const recurringEvents = this.expandRecurringEvent(
                event,
                rangeStart,
                rangeEnd,
              );
              events.push(...recurringEvents);
            } else {
              // Handle single, non-recurring events
              const singleEvent = this.createCalendarEventFromIcalEvent(event);
              if (singleEvent) {
                // Only include single events that fall within our processing range
                const startTime = singleEvent.startTime.getTime();
                if (
                  startTime >= rangeStart.getTime() &&
                  startTime <= rangeEnd.getTime()
                ) {
                  this.logger.debug(
                    `Created single event: ${singleEvent.summary} on ${singleEvent.startTime.toISOString()}`,
                  );
                  events.push(singleEvent);
                }
              }
            }
          } catch (eventError) {
            this.logger.warn(
              `Failed to process individual event component: ${eventError.message}`,
            );
          }
        }

        this.logger.debug(
          `Processed ${events.length} total events from ${url}`,
        );
      } catch (error) {
        // Log error but continue with other URLs
        this.logger.error(
          `Failed to fetch iCal data from ${url}: ${error.message}`,
        );
      }
    }

    this.logger.debug(`Total events fetched: ${events.length}`);
    return events;
  }

  /**
   * Expands recurring events using the ICAL.Event iterator, which correctly
   * handles exceptions (RECURRENCE-ID) and cancellations (EXDATE).
   * @private
   */
  private expandRecurringEvent(
    event: any,
    rangeStart: Date,
    rangeEnd: Date,
  ): CalendarEvent[] {
    const events: CalendarEvent[] = [];
    const summary = event.summary || 'Untitled';

    try {
      const iterator = event.iterator();
      let occurrence;
      let iterationCount = 0;
      const maxIterations = 1000; // Safety break

      const icalRangeStart = this.dateToICALTime(rangeStart);
      const icalRangeEnd = this.dateToICALTime(rangeEnd);

      // The iterator expands occurrences, automatically handling all recurrence logic.
      while ((occurrence = iterator.next()) && iterationCount < maxIterations) {
        iterationCount++;

        // Stop if we've expanded past our desired range
        if (occurrence.compare(icalRangeEnd) > 0) {
          break;
        }

        // If the occurrence is within our target range, create an event for it
        if (occurrence.compare(icalRangeStart) >= 0) {
          const details = event.getOccurrenceDetails(occurrence);
          const eventForOccurrence =
            this.createCalendarEventFromOccurrenceDetails(details);
          if (eventForOccurrence) {
            events.push(eventForOccurrence);
          }
        }
      }

      if (iterationCount >= maxIterations) {
        this.logger.warn(
          `Recurring event expansion hit iteration limit for: ${summary}`,
        );
      }

      this.logger.debug(
        `Expanded recurring event "${summary}" into ${events.length} occurrences`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to expand recurring event "${summary}": ${error.message}`,
      );
    }

    return events;
  }

  /**
   * Creates a CalendarEvent from the details of a specific recurring event occurrence.
   * This uses the details object which contains any modifications from a RECURRENCE-ID.
   * @private
   */
  private createCalendarEventFromOccurrenceDetails(
    details: any,
  ): CalendarEvent | null {
    try {
      const item = details.item; // This is an ICAL.Event for the specific occurrence

      // Create a unique ID for each instance to differentiate it from others in the series.
      const id = `${item.uid}-${details.recurrenceId.toString()}`;

      return new CalendarEvent({
        id: id,
        summary: item.summary || 'Untitled Event',
        description: item.description || null,
        location: item.location || null,
        startTime: details.startDate.toJSDate(),
        endTime: details.endDate.toJSDate(),
        isAllDay: details.startDate.isDate || false,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to create CalendarEvent from occurrence: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Creates a CalendarEvent from a single (non-recurring) ICAL.Event object.
   * @private
   */
  private createCalendarEventFromIcalEvent(event: any): CalendarEvent | null {
    try {
      // The ICAL.Event object conveniently provides normalized start and end date properties.
      return new CalendarEvent({
        id: event.uid || `generated-${Date.now()}-${Math.random()}`,
        summary: event.summary || 'Untitled Event',
        description: event.description || null,
        location: event.location || null,
        startTime: event.startDate.toJSDate(),
        endTime: event.endDate.toJSDate(),
        isAllDay: event.startDate.isDate || false,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to create CalendarEvent from ICAL.Event: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Converts a JavaScript Date to ICAL.Time for comparison
   * @private
   */
  private dateToICALTime(date: Date): any {
    try {
      // Convert to ICAL.Time in the proper timezone
      return ICAL.Time.fromJSDate(date, false); // false = local time
    } catch (error) {
      this.logger.warn(`Failed to convert date to ICAL.Time: ${error.message}`);
      return ICAL.Time.fromJSDate(date, true); // fallback to UTC
    }
  }

  /**
   * Determines if an event is relevant for today (in Brazil time)
   * Using luxon for reliable timezone handling
   * @private
   */
  private isRelevantEvent(event: CalendarEvent): boolean {
    const targetTimeZone = 'America/Sao_Paulo';

    // Define "today" in the target timezone - now using container time which should be BRT
    const nowInBrt = DateTime.now().setZone(targetTimeZone);
    const todayStart = nowInBrt.startOf('day');
    const todayEnd = nowInBrt.endOf('day');

    this.logger.debug(
      `Container time: ${new Date().toISOString()}, BRT time: ${nowInBrt.toISO()}`,
    );
    this.logger.debug(
      `Today range (BRT): ${todayStart.toISO()} to ${todayEnd.toISO()}`,
    );

    // Represent event times in Luxon's DateTime object for reliable comparison
    const eventStart = DateTime.fromJSDate(event.startTime);
    const eventEnd = DateTime.fromJSDate(event.endTime);

    // Handle all-day events separately
    if (event.isAllDay) {
      // For all-day events, check if the event's date matches today's date in BRT
      // Convert event date to BRT timezone for comparison
      const eventDateInBrt = eventStart.setZone(targetTimeZone).toISODate();
      const todayDateInBrt = nowInBrt.toISODate();
      const isRelevant = eventDateInBrt === todayDateInBrt;

      this.logger.debug(
        `All-day event "${event.summary}": event date (BRT)=${eventDateInBrt}, today (BRT)=${todayDateInBrt}, RELEVANT=${isRelevant}`,
      );

      return isRelevant;
    }

    // For timed events, check for overlap with today's BRT day
    // Convert event times to BRT for accurate overlap detection
    const eventStartBrt = eventStart.setZone(targetTimeZone);
    const eventEndBrt = eventEnd.setZone(targetTimeZone);
    const eventInterval = Interval.fromDateTimes(eventStartBrt, eventEndBrt);
    const todayInterval = Interval.fromDateTimes(todayStart, todayEnd);

    const isRelevant = todayInterval.overlaps(eventInterval) || false;

    this.logger.debug(
      `Timed event "${event.summary}": ${eventStartBrt.toFormat('MM/dd HH:mm')} - ${eventEndBrt.toFormat('MM/dd HH:mm')} BRT, RELEVANT=${isRelevant}`,
    );

    return isRelevant;
  }

  /**
   * Helper function to get day name from day number
   * @private
   */
  private getDayName(dayNumber: number): string {
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    return days[dayNumber];
  }
}
