import { ICalService } from '../lib/core/services/ical.service';
import { ConfigService } from '../lib/core/services/config.service';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

async function debugTimezone() {
  // Create a mock logger
  const mockLogger = {
    log: (message: string) => console.log(`[LOG] ${message}`),
    debug: (message: string) => console.log(`[DEBUG] ${message}`),
    warn: (message: string) => console.log(`[WARN] ${message}`),
    error: (message: string) => console.error(`[ERROR] ${message}`),
  };

  // Create mock config service
  const mockNestConfigService = {
    get: (key: string) => process.env[key],
  };
  const configService = new ConfigService(mockNestConfigService as any);

  // Create the iCal service
  const icalService = new ICalService(configService);

  // Override the logger to see all debug output
  (icalService as any).logger = mockLogger;

  console.log('=== Timezone Debug Test ===\n');

  // Show current system time
  const now = new Date();
  console.log('Current system time:', now.toISOString());
  console.log(
    'System timezone offset:',
    now.getTimezoneOffset(),
    'minutes from UTC',
  );
  console.log(
    'Current time in BRT:',
    now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }),
  );
  console.log('');

  // Test timezone handling
  console.log('=== Testing Timezone Handling ===');
  const testDate = new Date('2025-06-13T14:00:00Z'); // 2 PM UTC
  console.log('Test date (UTC):', testDate.toISOString());
  console.log(
    'Same time in BRT:',
    testDate.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }),
  );
  console.log('');

  // Fetch today's events
  try {
    console.log("=== Fetching Today's Events ===");
    const events = await icalService.getTodayEvents();

    console.log(`Found ${events.length} events for today\n`);

    events.forEach((event, index) => {
      console.log(`Event ${index + 1}: ${event.summary}`);
      console.log(`  Start (UTC): ${event.startTime.toISOString()}`);
      console.log(
        `  Start (BRT): ${event.startTime.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })}`,
      );
      console.log(`  End (UTC): ${event.endTime.toISOString()}`);
      console.log(
        `  End (BRT): ${event.endTime.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })}`,
      );
      console.log(`  Formatted: ${event.formatForMessage()}`);
      console.log('');
    });

    // Test formatting with correct timezone
    console.log('=== Testing Correct Formatting ===');
    if (events.length > 0) {
      const event = events[0];
      const correctTimeRange = `${event.startTime.toLocaleTimeString('en-US', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })}–${event.endTime.toLocaleTimeString('en-US', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })}`;

      console.log(`Current formatting: ${event.formatTimeRange()}`);
      console.log(`Correct formatting: ${correctTimeRange}`);
    }
  } catch (error) {
    console.error('Error fetching events:', error);
  }
}

// Run the debug test
debugTimezone().catch(console.error);
