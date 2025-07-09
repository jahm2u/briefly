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

async function testTodoistProjects() {
  console.log('Testing Todoist API projects connection...');
  
  if (!token) {
    console.error('TODOIST_API_TOKEN is not set in .env file');
    return;
  }
  
  try {
    console.log('Creating Todoist API client...');
    const api = new TodoistApi(token);
    
    // Test 1: Get projects
    console.log('\n--- Attempting to get projects ---');
    try {
      const projectsResponse = await api.getProjects();
      
      // Handle response which might not be an array directly
      const projects = Array.isArray(projectsResponse) ? projectsResponse : [];
      console.log(`Successfully retrieved ${projects.length} projects:`);
      
      if (projects.length > 0) {
        // Log each project with ID and name
        projects.forEach(project => {
          console.log(`- Project: ${project.name} (ID: ${project.id})`);
        });
      } else {
        console.log('No projects found in your Todoist account.');
      }
    } catch (error) {
      console.error('Error getting projects:', error.message);
    }
    
    // Test 2: Try to get all tasks without filter
    console.log('\n--- Attempting to get all tasks ---');
    try {
      const tasksResponse = await api.getTasks();
      
      // Handle response which might not be an array directly
      const tasks = Array.isArray(tasksResponse) ? tasksResponse : [];
      console.log(`Successfully retrieved ${tasks.length} tasks.`);
      
      if (tasks.length > 0) {
        console.log('First 5 tasks:');
        tasks.slice(0, 5).forEach(task => {
          console.log(`- Task: ${task.content} (ID: ${task.id})`);
        });
      } else {
        console.log('No tasks found in your Todoist account.');
      }
    } catch (error) {
      console.error('Error getting tasks:', error.message);
    }
    
    console.log('\nTodoist API testing complete.');
  } catch (error) {
    console.error('Error testing Todoist API:', error.message);
  }
}

// Run the test
testTodoistProjects().catch(err => {
  console.error('Unhandled error:', err);
});
