/**
 * Briefly - Calendar Debug Script
 *
 * This script tests calendar event date/time handling to diagnose timezone issues
 */

const ICAL = require('ical.js');
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Function to load environment variables
function loadEnvConfig() {
  // Try to load from root directory first, then from API directory if that fails
  const rootEnvPath = path.resolve(process.cwd(), '../.env');
  const apiEnvPath = path.resolve(process.cwd(), '.env');

  if (fs.existsSync(rootEnvPath)) {
    console.log('Loading environment from root directory .env file');
    dotenv.config({ path: rootEnvPath });
  } else if (fs.existsSync(apiEnvPath)) {
    console.log('Loading environment from API directory .env file');
    dotenv.config({ path: apiEnvPath });
  } else {
    console.error('No .env file found in either root or API directories');
    process.exit(1);
  }
}

/**
 * Current isToday implementation (potentially problematic)
 */
function isToday(eventStart: Date): boolean {
  const today = new Date();
  return (
    eventStart.getFullYear() === today.getFullYear() &&
    eventStart.getMonth() === today.getMonth() &&
    eventStart.getDate() === today.getDate()
  );
}

/**
 * Fixed isToday implementation that handles timezone issues
 */
function isTodayFixed(eventStart: Date): boolean {
  // Get today's date at midnight in local timezone
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get tomorrow's date at midnight in local timezone
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Check if the event is between today at midnight and tomorrow at midnight
  return eventStart >= today && eventStart < tomorrow;
}

/**
 * Test calendar event detection in live environment
 */
async function debugCalendarEvents() {
  console.log('\n=== DEBUGGING CALENDAR EVENTS ===');

  // Get the iCal URLs from environment
  const icalUrls = process.env.ICAL_URLS;
  if (!icalUrls) {
    console.error('❌ ICAL_URLS not found in environment variables');
    return;
  }

  console.log('✅ ICAL_URLS found in environment');
  const urls = icalUrls.split(',');

  // Process each URL
  console.log(`Found ${urls.length} calendar URLs to check`);

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`\n[Calendar ${i + 1}] Testing URL: ${url}`);

    try {
      console.log('Fetching calendar data...');

      // Fetch iCal data using fetch
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const icalData = await response.text();

      // Parse with ical.js
      const jcalData = ICAL.parse(icalData);
      const comp = new ICAL.Component(jcalData);

      // Get all VEVENT components
      const vevents = comp.getAllSubcomponents('vevent');
      console.log('✅ Successfully fetched calendar data');

      // Convert VEVENT components to a more usable format
      const allEvents = vevents
        .map((vevent) => {
          try {
            const dtstart = vevent.getFirstPropertyValue('dtstart');
            const summary =
              vevent.getFirstPropertyValue('summary') || 'Untitled Event';

            return {
              summary,
              start: dtstart ? dtstart.toJSDate() : new Date(),
            };
          } catch (error) {
            console.warn(`Failed to parse event: ${error.message}`);
            return null;
          }
        })
        .filter((event) => event !== null);

      console.log(`Found ${allEvents.length} total events in the calendar`);

      // Debug timezone information
      console.log('\n=== TIMEZONE INFORMATION ===');
      console.log(
        `Local timezone offset: ${new Date().getTimezoneOffset() / -60} hours`,
      );
      console.log(`Current local time: ${new Date().toLocaleString()}`);
      console.log(`Current UTC time: ${new Date().toUTCString()}`);

      // Analyze events for today using current implementation
      const todayEvents = allEvents.filter((event) => isToday(event.start));
      console.log(
        `\nEvents today (current implementation): ${todayEvents.length}`,
      );

      if (todayEvents.length > 0) {
        console.log("\nToday's events (current implementation):");
        todayEvents.forEach((event, index) => {
          console.log(
            `${index + 1}. "${event.summary}" - starts at ${event.start.toLocaleString()} local (${event.start.toUTCString()} UTC)`,
          );
        });
      }

      // Analyze events for today using fixed implementation
      const todayEventsFixed = allEvents.filter((event) =>
        isTodayFixed(event.start),
      );
      console.log(
        `\nEvents today (fixed implementation): ${todayEventsFixed.length}`,
      );

      if (todayEventsFixed.length > 0) {
        console.log("\nToday's events (fixed implementation):");
        todayEventsFixed.forEach((event, index) => {
          console.log(
            `${index + 1}. "${event.summary}" - starts at ${event.start.toLocaleString()} local (${event.start.toUTCString()} UTC)`,
          );
        });
      }

      // Check events for other days to see if any are being miscategorized
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      const tomorrowEvents = allEvents.filter(
        (event) => event.start >= tomorrow && event.start < dayAfterTomorrow,
      );

      if (tomorrowEvents.length > 0) {
        console.log('\nEvents for tomorrow:');
        tomorrowEvents.forEach((event, index) => {
          console.log(
            `${index + 1}. "${event.summary}" - starts at ${event.start.toLocaleString()} local (${event.start.toUTCString()} UTC)`,
          );
        });
      }

      // Check recent events (last 3 days) to confirm if data is current
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const recentEvents = allEvents.filter(
        (event) => event.start >= threeDaysAgo,
      );
      console.log(
        `\nEvents in recent days (past 3 days through tomorrow): ${recentEvents.length}`,
      );

      if (recentEvents.length > 0) {
        console.log('\nSample of recent events (up to 5):');
        recentEvents.slice(0, 5).forEach((event, index) => {
          console.log(
            `${index + 1}. "${event.summary}" - starts at ${event.start.toLocaleString()} local (${event.start.toUTCString()} UTC)`,
          );
        });
      } else {
        console.log(
          '\n⚠️ No recent events found. Calendar might be outdated or empty.',
        );
      }
    } catch (error) {
      console.error(`❌ ERROR fetching calendar data: ${error.message}`);
    }
  }
}

// Run the debug script
loadEnvConfig();
debugCalendarEvents().catch((error) => {
  console.error('Unexpected error during debugging:', error);
});
