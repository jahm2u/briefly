import { TodoistApi } from '@doist/todoist-api-typescript';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load the .env file from the project root (main .env file with the real token)
dotenv.config({ path: resolve(__dirname, '../.env') });

// Log the token being used (truncated for security)
const token = process.env.TODOIST_API_TOKEN;
if (token) {
  const firstChars = token.substring(0, 5);
  const lastChars = token.substring(token.length - 5);
  console.log(`Using Todoist API token: ${firstChars}...${lastChars}`);
}

async function testTodoist() {
  console.log('Testing Todoist API connection...');
  
  const token = process.env.TODOIST_API_TOKEN;
  if (!token) {
    console.error('TODOIST_API_TOKEN is not set in .env file');
    return;
  }
  
  const api = new TodoistApi(token);
  
  try {
    // Test 1: Get all tasks
    console.log('\n--- Testing get all tasks ---');
    const allTasks = await api.getTasks();
    console.log(`Total tasks: ${Array.isArray(allTasks) ? allTasks.length : 0}`);
    
    if (Array.isArray(allTasks) && allTasks.length > 0) {
      console.log('First task example:');
      console.log(JSON.stringify(allTasks[0], null, 2));
    }
    
    // Test 2: Get tasks due today
    console.log('\n--- Testing today tasks ---');
    try {
      // The getTasks method seems to require different parameters in different versions
      // Try multiple approaches
      let todayTasks: any[] = [];
      
      try {
        // First approach - standard filter parameter
        const allTasksResult = await api.getTasks();
        // Convert to array and handle type properly
        const allTasks: any[] = Array.isArray(allTasksResult) ? allTasksResult : []; 
        // Manual filter to find today's tasks based on due date
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        todayTasks = allTasks.filter(task => {
          if (task.due && task.due.date) {
            return task.due.date.startsWith(todayStr);
          }
          return false;
        });
        
        console.log(`Tasks due today (filtered client-side): ${todayTasks.length}`);
      } catch (e) {
        console.log(`Failed with standard filtering: ${e.message}`);
      }
      
      if (todayTasks.length > 0) {
        console.log('First today task example:');
        console.log(JSON.stringify(todayTasks[0], null, 2));
      } else {
        console.log('No tasks due today found');
      }
    } catch (error) {
      console.error('Error with today filter:', error.message);
    }
    
    // Test 3: Using the getTasksByFilter method which we use in the actual service
    console.log('\n--- Testing todoist.service approach with getTasksByFilter ---');
    try {
      // This is the exact code used in the TodoistService class
      const query = 'today';
      // Cast the entire API to any to bypass TypeScript's checking of the getTasksByFilter method
      // Using the correct REST API filter format
      const todoistApi: any = api;
      const result = await todoistApi.getTasks({
        filter: 'today'  // This is the proper REST API filter syntax
      });
      
      // Force the result to be treated as an array, since we know that's what the API actually returns
      const todayTasks: any[] = Array.isArray(result) ? result : [];
      console.log(`Tasks from filter query '${query}': ${todayTasks.length}`);
      
      if (todayTasks.length > 0) {
        console.log('First filtered task example:');
        console.log(JSON.stringify(todayTasks[0], null, 2));
        
        // Example of how we'd convert to our Task model
        console.log('Example of task data that would be converted to our Task model:');
        const exampleTaskData = {
          id: todayTasks[0].id,
          content: todayTasks[0].content,
          description: todayTasks[0].description || '',
          url: todayTasks[0].url,
          due: todayTasks[0].due,
          priority: todayTasks[0].priority,
          projectId: todayTasks[0].project_id
        };
        console.log(JSON.stringify(exampleTaskData, null, 2));
      } else {
        console.log(`No tasks found with query '${query}'`);
      }
    } catch (error) {
      console.error('Error with getTasksByFilter:', error.message);
      console.log('This is likely the root cause of your issues!');
    }
    
    // Test 4: Check for inbox tasks
    console.log('\n--- Testing inbox tasks ---');
    try {
      // Try getTasksByFilter with #inbox
      try {
        // Same approach as above, cast to any to bypass TypeScript checking
        const todoistApi: any = api;
        const inboxResult = await todoistApi.getTasksByFilter({
          query: '#inbox',
          limit: 200
        });
        
        const inboxTasks: any[] = Array.isArray(inboxResult) ? inboxResult : [];
        console.log(`Inbox tasks (via #inbox filter): ${inboxTasks.length}`);
        
        if (inboxTasks.length > 0) {
          console.log('First inbox task example:');
          console.log(JSON.stringify(inboxTasks[0], null, 2));
        }
      } catch (inboxError) {
        console.error('Error with #inbox filter:', inboxError.message);
        
        // Fallback to tasks with no project
        try {
          // Note: '' is an empty string, not null, to avoid TypeScript errors
          const noProjectTasks = await api.getTasks({ projectId: '' });
          console.log(`No project tasks (fallback): ${Array.isArray(noProjectTasks) ? noProjectTasks.length : 0}`);
        } catch (noProjectError) {
          console.error('Error with no project filter:', noProjectError.message);
        }
      }
    } catch (error) {
      console.error('Error with inbox tasks query:', error.message);
    }
    
    console.log('\nTodoist API testing complete.');
  } catch (error) {
    console.error('Error testing Todoist API:', error.message);
  }
}

// Run the test
testTodoist().catch(err => {
  console.error('Unhandled error:', err);
});
