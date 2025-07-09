/**
 * Briefly - API Connection Diagnostics Script
 *
 * This script tests connections to Todoist and iCal services
 * to help diagnose issues with the application.
 */

import { TodoistApi } from '@doist/todoist-api-typescript';
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

// Test Todoist API connection
async function testTodoistConnection() {
  console.log('\n=== TESTING TODOIST API CONNECTION ===');
  const todoistToken = process.env.TODOIST_API_TOKEN;

  if (!todoistToken) {
    console.error(
      '❌ ERROR: TODOIST_API_TOKEN not found in environment variables',
    );
    return false;
  }

  console.log('✅ TODOIST_API_TOKEN found in environment');

  try {
    console.log('Attempting to connect to Todoist API...');
    const api = new TodoistApi(todoistToken);

    // 1. Get all tasks (no filter)
    console.log('\nFetching all tasks...');
    const allTasks = await api.getTasks();
    const allTasksArray = Array.isArray(allTasks) ? allTasks : [];
    console.log(
      `✅ Retrieved ${allTasksArray.length} total tasks from your Todoist account`,
    );

    // 2. Get today tasks
    console.log('\nFetching today tasks...');
    const todayTasks = await api.getTasksByFilter({
      query: 'today',
      limit: 100,
    });
    // The response structure depends on the API version - handle both possible formats
    const todayTasksArray = Array.isArray(todayTasks)
      ? todayTasks
      : todayTasks && 'items' in todayTasks && Array.isArray(todayTasks.items)
        ? todayTasks.items
        : [];
    console.log(`✅ Retrieved ${todayTasksArray.length} tasks due today`);

    // Display first 3 tasks from today view as a sample
    if (todayTasksArray.length > 0) {
      console.log('\nSample today tasks (first 3):');
      todayTasksArray.slice(0, 3).forEach((task, index) => {
        console.log(`  ${index + 1}. ${task.content}`);
      });
    }

    // 3. Get inbox tasks
    console.log('\nFetching inbox tasks...');
    const inboxTasks = await api.getTasksByFilter({
      query: '#inbox',
      limit: 100,
    });
    // The response structure depends on the API version - handle both possible formats
    const inboxTasksArray = Array.isArray(inboxTasks)
      ? inboxTasks
      : inboxTasks && 'items' in inboxTasks && Array.isArray(inboxTasks.items)
        ? inboxTasks.items
        : [];
    console.log(`✅ Retrieved ${inboxTasksArray.length} tasks in inbox`);

    // Display first 3 tasks from inbox as a sample
    if (inboxTasksArray.length > 0) {
      console.log('\nSample inbox tasks (first 3):');
      inboxTasksArray.slice(0, 3).forEach((task, index) => {
        console.log(`  ${index + 1}. ${task.content}`);
      });
    }

    console.log('\n✅ Successfully tested Todoist API');
    return true;
  } catch (error) {
    console.error('❌ ERROR connecting to Todoist API:', error.message);
    console.error('Please check your API token and internet connection');
    return false;
  }
}

// Test iCal URL connection
async function testICalConnection() {
  console.log('\n=== TESTING ICAL CONNECTION ===');
  const icalUrls = process.env.ICAL_URLS;

  if (!icalUrls) {
    console.error('❌ ERROR: ICAL_URLS not found in environment variables');
    return false;
  }

  console.log('✅ ICAL_URLS found in environment');
  const urls = icalUrls.split(',');

  try {
    console.log(`Attempting to fetch ${urls.length} iCal calendars...`);

    for (const url of urls) {
      console.log(`\nTesting URL: ${url}`);
      
      // Fetch iCal data using fetch instead of node-ical
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
      console.log(`✅ Successfully connected to iCal URL`);
      console.log(`✅ Retrieved ${vevents.length} events from calendar`);

      // Show today's events
      const today = new Date();
      const todayEvents = vevents.filter((vevent) => {
        try {
          const dtstart = vevent.getFirstPropertyValue('dtstart');
          if (!dtstart) return false;
          
          const eventDate = dtstart.toJSDate();
          return (
            eventDate.getFullYear() === today.getFullYear() &&
            eventDate.getMonth() === today.getMonth() &&
            eventDate.getDate() === today.getDate()
          );
        } catch (error) {
          console.warn(`Failed to parse event date: ${error.message}`);
          return false;
        }
      });

      console.log(`✅ Found ${todayEvents.length} events for today`);

      // Display today's events if any
      if (todayEvents.length > 0) {
        console.log("\nToday's events:");
        todayEvents.forEach((vevent, index) => {
          try {
            const dtstart = vevent.getFirstPropertyValue('dtstart');
            const summary = vevent.getFirstPropertyValue('summary') || 'Untitled Event';
            
            if (dtstart) {
              const start = dtstart.toJSDate();
              const hours = String(start.getHours()).padStart(2, '0');
              const minutes = String(start.getMinutes()).padStart(2, '0');
              console.log(`  ${index + 1}. ${hours}:${minutes} - ${summary}`);
            }
          } catch (error) {
            console.warn(`Failed to format event: ${error.message}`);
          }
        });
      } else {
        console.log('No events found for today in this calendar');
      }
    }

    return true;
  } catch (error) {
    console.error('❌ ERROR connecting to iCal URL:', error.message);
    console.error('Please check your iCal URL and internet connection');
    return false;
  }
}

// Main function to run all diagnostics
async function runDiagnostics() {
  console.log('Starting Briefly API diagnostics...');
  loadEnvConfig();

  const todoistResult = await testTodoistConnection();
  const icalResult = await testICalConnection();

  console.log('\n=== DIAGNOSTICS SUMMARY ===');
  console.log(
    `Todoist API Connection: ${todoistResult ? '✅ SUCCESS' : '❌ FAILED'}`,
  );
  console.log(
    `iCal URL Connection: ${icalResult ? '✅ SUCCESS' : '❌ FAILED'}`,
  );

  if (!todoistResult || !icalResult) {
    console.log(
      '\nFix the issues above to get your Briefly application working correctly.',
    );
  } else {
    console.log(
      '\nAll systems operational! Your Briefly application should be working correctly.',
    );
    console.log("If you're still experiencing issues, check:");
    console.log('1. Is the Telegram bot token correct?');
    console.log('2. Is the TELEGRAM_CHAT_ID correct?');
    console.log('3. Is your OpenAI API key valid?');
  }
}

// Run the diagnostics
runDiagnostics().catch((error) => {
  console.error('Unexpected error during diagnostics:', error);
});
