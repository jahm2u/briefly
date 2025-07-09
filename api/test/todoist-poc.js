/**
 * Simple Todoist API POC
 * This script directly tests the Todoist API without TypeScript complexities
 */
const { TodoistApi } = require('@doist/todoist-api-typescript');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Get token and validate
const token = process.env.TODOIST_API_TOKEN;
if (!token) {
  console.error('ERROR: TODOIST_API_TOKEN not found in .env file');
  process.exit(1);
}

// Initialize API client
const api = new TodoistApi(token);

// Log token (first 3 and last 3 chars only)
const maskedToken = `${token.substring(0, 3)}...${token.substring(token.length - 3)}`;
console.log(`Using Todoist API token: ${maskedToken}`);

// Dump response to file for debugging
function saveResponse(filename, data) {
  fs.writeFileSync(path.join(__dirname, filename), JSON.stringify(data, null, 2));
  console.log(`Saved response to ${filename}`);
}

// Ensure array handling
function ensureArray(data) {
  if (!data) return [];
  return Array.isArray(data) ? data : [];
}

// Helper for formatting projects
function formatProjects(projects) {
  const projectsArray = ensureArray(projects);
  if (projectsArray.length === 0) {
    return 'No projects found';
  }
  
  return projectsArray.map(p => `- ${p.name} (ID: ${p.id})`).join('\n');
}

// Helper for formatting tasks
function formatTasks(tasks) {
  const tasksArray = ensureArray(tasks);
  if (tasksArray.length === 0) {
    return 'No tasks found';
  }
  
  return tasksArray.slice(0, 5).map(t => 
    `- ${t.content} (Project: ${t.projectId}, Completed: ${!!t.completed})`
  ).join('\n');
}

// Main test function
async function testTodoist() {
  console.log('=== Todoist API Test ===');
  
  try {
    // 1. Test projects
    console.log('\n1. Testing projects...');
    const projects = await api.getProjects();
    console.log('Raw projects response:', JSON.stringify(projects).substring(0, 100) + '...');
    const projectsArray = ensureArray(projects);
    console.log(`Found ${projectsArray.length} projects`);
    console.log(formatProjects(projects));
    saveResponse('todoist-projects.json', projects);
    
    // 2. Test direct REST API call
    console.log('\n2. Testing REST API directly...');
    // Make raw HTTP request to test API
    const https = require('https');
    const options = {
      hostname: 'api.todoist.com',
      path: '/rest/v2/tasks',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    // Promise wrapper for HTTP request
    const makeRequest = () => {
      return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            try {
              const parsedData = JSON.parse(data);
              resolve({ statusCode: res.statusCode, data: parsedData });
            } catch (e) {
              resolve({ statusCode: res.statusCode, data: data });
            }
          });
        }).on('error', (err) => {
          reject(err);
        });
        req.end();
      });
    };

    const response = await makeRequest();
    console.log(`Direct API call status: ${response.statusCode}`);
    if (response.statusCode === 200) {
      const directTasks = ensureArray(response.data);
      console.log(`Found ${directTasks.length} tasks via direct API call`);
      if (directTasks.length > 0) {
        console.log('First task:', directTasks[0].content);
      }
      saveResponse('todoist-direct-tasks.json', response.data);
    } else {
      console.log('Direct API call failed:', response.data);
    }
    
    // 3. Test with SDK (no filter)
    console.log('\n3. Testing active tasks via SDK (no filter)...');
    try {
      const tasks = await api.getTasks();
      const tasksArray = ensureArray(tasks);
      console.log(`Found ${tasksArray.length} active tasks`);
      console.log(formatTasks(tasks));
      saveResponse('todoist-tasks.json', tasks);
      
      // 4. Test with different filters
      console.log('\n4. Testing with different filters...');
      
      // Test with empty filter
      const emptyFilterTasks = await api.getTasks({});
      const emptyFilterArray = ensureArray(emptyFilterTasks);
      console.log(`Found ${emptyFilterArray.length} tasks with empty filter`);
      
      // Test "today" filter
      try {
        const todayTasks = await api.getTasks({ filter: 'today' });
        const todayArray = ensureArray(todayTasks);
        console.log(`Found ${todayArray.length} tasks with "today" filter`);
      } catch (e) {
        console.log('Error with today filter:', e.message);
      }
      
      // Test with specific project
      if (projectsArray.length > 0) {
        try {
          const projectId = projectsArray[0].id;
          const projectTasks = await api.getTasks({ projectId });
          const projectTasksArray = ensureArray(projectTasks);
          console.log(`Found ${projectTasksArray.length} tasks in project "${projectsArray[0].name}"`);
        } catch (e) {
          console.log('Error with project filter:', e.message);
        }
      }
      
      // 5. Diagnostic summary
      console.log('\n5. Diagnostic summary:');
      console.log('- API connectivity: SUCCESS');
      console.log(`- Projects found: ${projectsArray.length}`);
      console.log(`- Tasks found (direct API): ${response.statusCode === 200 ? ensureArray(response.data).length : 'ERROR'}`);
      console.log(`- Tasks found (SDK): ${tasksArray.length}`);
      
      if (tasksArray.length === 0) {
        console.log('\nPOSSIBLE REASONS FOR NO TASKS:');
        console.log('1. You have no active tasks in your Todoist account');
        console.log('2. API token lacks necessary permissions');
        console.log('3. All tasks are in a specific project not visible to this token');
        console.log('4. All tasks are completed (completed tasks are not returned by default)');
      }
    } catch (sdkError) {
      console.error('SDK Error:', sdkError.message);
      if (sdkError.response) {
        console.error('Status:', sdkError.response.status);
        console.error('Response data:', sdkError.response.data);
      }
    }
  } catch (error) {
    console.error('General error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testTodoist().catch(err => console.error('Unhandled error:', err));

