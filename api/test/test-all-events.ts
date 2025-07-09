import { ICalService } from '../lib/core/services/ical.service';
import { ConfigService } from '../lib/core/services/config.service';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

async function testAllEvents() {
  // Create mock logger
  const mockLogger = {
    log: (message: string) => console.log(`[LOG] ${message}`),
    debug: (message: string) => {}, // Suppress debug logs
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
  
  // Override the logger
  (icalService as any).logger = mockLogger;

  console.log('=== Testing Calendar Events ===\n');
  
  try {
    console.log('Fetching today\'s events...');
    const events = await icalService.getTodayEvents();
    
    console.log(`\nFound ${events.length} events for today\n`);
    
    if (events.length === 0) {
      console.log('No events found. Let me check the filtering...\n');
      
      // Call the private fetchEvents method to see all events
      const allEvents = await (icalService as any).fetchEvents();
      console.log(`Total events in calendar: ${allEvents.length}`);
      
      // Show some recent events
      const now = new Date();
      const recentEvents = allEvents.filter((event: any) => {
        const daysDiff = Math.abs((event.startTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff < 7; // Events within 7 days
      });
      
      console.log(`\nEvents within 7 days: ${recentEvents.length}`);
      recentEvents.slice(0, 10).forEach((event: any, index: number) => {
        console.log(`\nEvent ${index + 1}: ${event.summary}`);
        console.log(`  Start (UTC): ${event.startTime.toISOString()}`);
        console.log(`  Start (BRT): ${event.startTime.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })}`);
        console.log(`  End (BRT): ${event.endTime.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })}`);
        
        // Check if it should be today
        const eventDateBRT = event.startTime.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
        const todayBRT = now.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
        console.log(`  Event date (BRT): ${eventDateBRT}, Today (BRT): ${todayBRT}`);
        console.log(`  Should be today? ${eventDateBRT === todayBRT ? 'YES' : 'NO'}`);
      });
    } else {
      events.forEach((event, index) => {
        console.log(`Event ${index + 1}: ${event.summary}`);
        console.log(`  Start (UTC): ${event.startTime.toISOString()}`);
        console.log(`  Start (BRT): ${event.startTime.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })}`);
        console.log(`  End (BRT): ${event.endTime.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })}`);
        console.log(`  Formatted: ${event.formatForMessage()}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testAllEvents().catch(console.error);