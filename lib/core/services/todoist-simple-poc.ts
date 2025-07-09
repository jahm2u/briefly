/**
 * Simple Todoist API POC
 * Tests direct API connectivity with minimal dependencies
 */
import { TodoistApi } from '@doist/todoist-api-typescript';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../../.env') });

// Get the API token
const token = process.env.TODOIST_API_TOKEN;

if (!token) {
  console.error('ERROR: TODOIST_API_TOKEN not found in .env file');
  process.exit(1);
}

// Initialize API client
const api = new TodoistApi(token);

// Test projects first (to verify API connectivity)
console.log('Testing Todoist API connection...');
api.getProjects()
  .then(projects => {
    console.log(`✓ Successfully connected to Todoist API`);
    console.log(`Found ${projects.length} projects`);
    
    if (projects.length > 0) {
      projects.forEach(p => console.log(`- ${p.name}`));
    }
    
    // Now test tasks
    console.log('\nFetching tasks...');
    return api.getTasks();
  })
  .then(tasks => {
    console.log(`Found ${tasks.length} tasks`);
    
    if (tasks.length > 0) {
      console.log('First 3 tasks:');
      tasks.slice(0, 3).forEach(t => console.log(`- ${t.content}`));
    } else {
      console.log('No tasks found. Possible reasons:');
      console.log('1. Your Todoist account has no active tasks');
      console.log('2. API token permissions issue');
      console.log('3. API filters or visibility settings');
      
      // Try another filter approach
      console.log('\nTrying with filter parameter...');
      return api.getTasks({ filter: '' });
    }
  })
  .then(filteredTasks => {
    // This only runs if the previous block returned api.getTasks({ filter: '' })
    if (filteredTasks && Array.isArray(filteredTasks)) {
      console.log(`Found ${filteredTasks.length} tasks with empty filter`);
      
      // Log some diagnostic information
      if (filteredTasks.length === 0) {
        console.log('\nDiagnostic information:');
        console.log('- Todoist API endpoint: https://api.todoist.com/rest/v2/tasks');
        console.log('- Using token ending with:', token.slice(-4));
        console.log('- Check your Todoist account for active tasks');
        console.log('- Verify API token has full access permission');
      }
    }
  })
  .catch(error => {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
  });
