import { TodoistApi } from '@doist/todoist-api-typescript';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { writeFileSync } from 'fs';

// Load the .env file from the project root
dotenv.config({ path: resolve(__dirname, '../../../.env') });

// Get token from environment
const token = process.env.TODOIST_API_TOKEN;

/**
 * Simple POC to test Todoist API task fetching with different approaches
 */
async function testTodoistTasks() {
  console.log('=== Todoist Task Fetching POC ===');
  
  if (!token) {
    console.error('ERROR: TODOIST_API_TOKEN is not set in .env file');
    return;
  }
  
  try {
    // Safely log part of the token for debugging
    const firstChars = token.substring(0, 3);
    const lastChars = token.substring(token.length - 3);
    console.log(`Using token: ${firstChars}...${lastChars}`);
    
    // Initialize API client
    const api = new TodoistApi(token);
    
    // 1. First try getting projects to confirm the API connection works
    console.log('\n1. Getting projects:');
    try {
      const projects = await api.getProjects();
      console.log(`Found ${projects.length} projects:`);
      projects.forEach(p => console.log(`- ${p.name} (ID: ${p.id})`));
      
      if (projects.length === 0) {
        console.log('WARNING: No projects found. This might be why no tasks are returned.');
      }
    } catch (error) {
      console.error('Error getting projects:', error.response?.status, error.message);
      // Check for auth issues
      if (error.response?.status === 401) {
        console.error('AUTH ERROR: Your API token appears to be invalid!');
      }
    }
    
    // 2. Try getting active tasks without filters
    console.log('\n2. Getting all active tasks:');
    try {
      const tasks = await api.getTasks();
      console.log(`Found ${tasks.length} tasks`);
      
      if (tasks.length > 0) {
        // Log the first 5 tasks
        tasks.slice(0, 5).forEach(t => console.log(`- ${t.content}`));
        // Save full response for debugging
        writeFileSync('./todoist-tasks-debug.json', JSON.stringify(tasks, null, 2));
        console.log('Full task data saved to todoist-tasks-debug.json');
      } else {
        console.log('No tasks found. Possible reasons:');
        console.log('- Your account has no active tasks');
        console.log('- The API token doesn\'t have access to tasks');
        console.log('- There might be a filter issue');
      }
    } catch (error) {
      console.error('Error getting tasks:', error.response?.status, error.message);
    }
    
    // 3. Try with explicit filter options
    console.log('\n3. Getting tasks with different filter options:');
    try {
      // Try with filter for all tasks including completed
      const options = { filter: '' }; // Empty filter should return all tasks
      const filteredTasks = await api.getTasks(options);
      console.log(`Found ${filteredTasks.length} tasks with empty filter`);
      
      if (filteredTasks.length > 0) {
        filteredTasks.slice(0, 5).forEach(t => {
          console.log(`- ${t.content} (Project: ${t.projectId}, Done: ${!!t.completed})`);
        });
      }
      
      // Try another filter for all tasks
      const allFilter = { filter: 'view all' };
      const allTasks = await api.getTasks(allFilter);
      console.log(`Found ${allTasks.length} tasks with 'view all' filter`);
      
      // Try today filter
      const todayFilter = { filter: 'today' };
      const todayTasks = await api.getTasks(todayFilter);
      console.log(`Found ${todayTasks.length} tasks with 'today' filter`);
      
    } catch (error) {
      console.error('Error with filter options:', error.response?.status, error.message);
    }
    
    // 4. Print HTTP request details for debugging
    console.log('\n4. Making request with debug info:');
    try {
      // Make a request and capture headers for debugging
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
      };
      
      // Log the API endpoint we're going to call
      console.log('API endpoint: https://api.todoist.com/rest/v2/tasks');
      console.log('Headers:', JSON.stringify(headers));
      
      // Actually make the request through the SDK
      const tasks = await api.getTasks();
      console.log('Request succeeded with SDK');
      
    } catch (error) {
      console.error('Debug request error:', error.message);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
testTodoistTasks().catch(err => {
  console.error('Unhandled error:', err);
});
