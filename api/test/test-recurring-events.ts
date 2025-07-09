import { ICalService } from '../lib/core/services/ical.service';
import { ConfigService } from '../lib/core/services/config.service';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const ICAL = require('ical.js');

async function testRecurringEvents() {
  // Create mock config service
  const mockNestConfigService = {
    get: (key: string) => process.env[key],
  };
  const configService = new ConfigService(mockNestConfigService as any);

  console.log('=== Testing Recurring Event Expansion ===\n');
  
  // Get the first calendar URL
  const urls = configService.getICalUrls();
  if (urls.length === 0) {
    console.error('No calendar URLs configured');
    return;
  }

  const url = urls[0];
  console.log(`Fetching calendar from: ${url}\n`);

  try {
    // Fetch the calendar
    const response = await fetch(url);
    const icalData = await response.text();
    
    // Parse with ical.js
    const jcalData = ICAL.parse(icalData);
    const comp = new ICAL.Component(jcalData);
    
    // Find recurring events
    const vevents = comp.getAllSubcomponents('vevent');
    const recurringEvents = vevents.filter(vevent => vevent.hasProperty('rrule'));
    
    console.log(`Found ${recurringEvents.length} recurring events\n`);
    
    // Test the first few recurring events
    const now = new Date();
    const rangeStart = new Date(now);
    rangeStart.setDate(now.getDate() - 30);
    const rangeEnd = new Date(now);
    rangeEnd.setDate(now.getDate() + 30);
    
    console.log(`Date range for expansion:`);
    console.log(`Start: ${rangeStart.toISOString()} = ${rangeStart.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })}`);
    console.log(`End: ${rangeEnd.toISOString()} = ${rangeEnd.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })}`);
    console.log('');
    
    for (let i = 0; i < Math.min(3, recurringEvents.length); i++) {
      const vevent = recurringEvents[i];
      const summary = vevent.getFirstPropertyValue('summary');
      const dtstart = vevent.getFirstPropertyValue('dtstart');
      const rrule = vevent.getFirstPropertyValue('rrule');
      
      console.log(`\nEvent ${i + 1}: ${summary}`);
      console.log(`DTSTART: ${dtstart ? dtstart.toString() : 'missing'}`);
      console.log(`RRULE: ${rrule ? rrule.toString() : 'missing'}`);
      
      if (dtstart) {
        try {
          // Create RecurExpansion
          const expand = new ICAL.RecurExpansion({
            component: vevent,
            dtstart: dtstart
          });
          
          // Convert dates to ICAL.Time
          const icalRangeStart = ICAL.Time.fromJSDate(rangeStart, false);
          const icalRangeEnd = ICAL.Time.fromJSDate(rangeEnd, false);
          
          console.log(`ICAL Range Start: ${icalRangeStart.toString()}`);
          console.log(`ICAL Range End: ${icalRangeEnd.toString()}`);
          
          // Get first few occurrences
          const occurrences: any[] = [];
          let occurrence = expand.next();
          let count = 0;
          
          while (occurrence && count < 10) {
            occurrences.push(occurrence);
            const jsDate = occurrence.toJSDate();
            console.log(`  Occurrence ${count + 1}: ${occurrence.toString()} = ${jsDate.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })}`);
            
            // Check if in range
            const inRange = occurrence.compare(icalRangeStart) >= 0 && occurrence.compare(icalRangeEnd) <= 0;
            console.log(`    -> ${inRange ? 'IN RANGE' : 'OUT OF RANGE'}`);
            
            
            occurrence = expand.next();
            count++;
          }
          
          if (occurrences.length === 0) {
            console.log('  No occurrences found!');
          }
        } catch (error) {
          console.error(`  Error expanding: ${error.message}`);
        }
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testRecurringEvents().catch(console.error);