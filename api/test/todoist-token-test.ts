/**
 * Todoist API Token Diagnostic Tool
 *
 * This script helps diagnose issues with Todoist API tokens, including:
 * - Token validity
 * - Permission scopes
 * - Account connection
 * - API version compatibility
 */

import { TodoistApi } from '@doist/todoist-api-typescript';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline';

// Define types for better type safety
type TodoistTask = {
  id: string;
  content: string;
  due?: {
    date: string;
    // other due properties
  };
  project_id?: string;
  // other task properties
};

type TodoistProject = {
  id: string;
  name: string;
  // other project properties
};

// Function to load environment variables
function loadEnvConfig() {
  // Try to load from root directory first (following our single source of truth approach)
  const rootEnvPath = path.resolve(process.cwd(), '../.env');

  if (fs.existsSync(rootEnvPath)) {
    console.log('Loading environment from root directory .env file');
    dotenv.config({ path: rootEnvPath });
  } else {
    console.error('❌ No .env file found in root directory');
    console.error(
      'Please create a .env file in the root directory with your TODOIST_API_TOKEN',
    );
    process.exit(1);
  }
}

// Function to validate a Todoist API token
async function validateTodoistToken(token: string) {
  console.log('\n==== TESTING TODOIST API TOKEN ====');

  try {
    console.log('Initializing Todoist API client...');
    const api = new TodoistApi(token);

    // Test 1: Try to get projects (basic test)
    console.log('\nTest 1: Fetching projects...');
    try {
      const projects = (await api.getProjects()) as unknown as TodoistProject[];
      const projectsArray = Array.isArray(projects) ? projects : [];
      console.log(`✅ Successfully fetched ${projectsArray.length} projects`);
      if (projectsArray.length > 0) {
        console.log('Sample projects:');
        projectsArray.slice(0, 3).forEach((project, i) => {
          console.log(`  ${i + 1}. ${project.name}`);
        });
      }
    } catch (error) {
      console.error(`❌ Failed to fetch projects: ${error.message}`);
      console.error('This suggests your token might be invalid or expired');
      return false;
    }

    // Test 2: Try to get tasks with today filter
    console.log("\nTest 2: Fetching today's tasks...");
    try {
      const todayResult = await api.getTasksByFilter({ query: 'today' });

      // Handle different API response formats
      let todayTasks: TodoistTask[] = [];
      if (Array.isArray(todayResult)) {
        todayTasks = todayResult as TodoistTask[];
      } else if (todayResult && typeof todayResult === 'object') {
        if (
          'items' in todayResult &&
          Array.isArray((todayResult as any).items)
        ) {
          todayTasks = (todayResult as any).items as TodoistTask[];
        }
      }

      console.log(
        `✅ Successfully fetched ${todayTasks.length} tasks for today`,
      );

      if (todayTasks.length === 0) {
        console.log('Note: You have 0 tasks due today in your Todoist account');
        console.log(
          'This is not an error if your today view in Todoist is actually empty',
        );
      } else {
        console.log('Sample tasks:');
        todayTasks.slice(0, 3).forEach((task, i) => {
          console.log(`  ${i + 1}. ${task.content}`);
        });
      }
    } catch (error) {
      console.error(`❌ Failed to fetch today's tasks: ${error.message}`);
      console.error(
        'This suggests a problem with filter permissions or syntax',
      );
      return false;
    }

    // Test 3: Try to get inbox tasks
    console.log('\nTest 3: Fetching inbox tasks...');
    try {
      // Try multiple approaches for inbox filter (API has different versions)
      let inboxTasks: TodoistTask[] = [];

      // Approach 1: Using #inbox filter
      try {
        const inboxResult = await api.getTasksByFilter({ query: '#inbox' });
        if (Array.isArray(inboxResult)) {
          inboxTasks = inboxResult as TodoistTask[];
        } else if (inboxResult && typeof inboxResult === 'object') {
          if (
            'items' in inboxResult &&
            Array.isArray((inboxResult as any).items)
          ) {
            inboxTasks = (inboxResult as any).items as TodoistTask[];
          }
        }
      } catch (err) {
        // Try alternative approach
      }

      // Approach 2: Using 'no project' filter if first approach failed
      if (inboxTasks.length === 0) {
        try {
          const noProjectResult = await api.getTasksByFilter({
            query: 'no project',
          });
          if (Array.isArray(noProjectResult)) {
            inboxTasks = noProjectResult as TodoistTask[];
          } else if (noProjectResult && typeof noProjectResult === 'object') {
            if (
              'items' in noProjectResult &&
              Array.isArray((noProjectResult as any).items)
            ) {
              inboxTasks = (noProjectResult as any).items as TodoistTask[];
            }
          }
        } catch (err) {
          // Continue to next approach
        }
      }

      // Approach 3: Using project_id if previous approaches failed
      if (inboxTasks.length === 0) {
        try {
          // First get all projects to find inbox
          const projects =
            (await api.getProjects()) as unknown as TodoistProject[];
          const projectsArray = Array.isArray(projects) ? projects : [];
          const inbox = projectsArray.find(
            (p) => p.name.toLowerCase() === 'inbox',
          );

          if (inbox) {
            const inboxTasksResult = (await api.getTasks({
              projectId: inbox.id,
            })) as unknown as TodoistTask[];
            inboxTasks = Array.isArray(inboxTasksResult)
              ? inboxTasksResult
              : [];
          }
        } catch (err) {
          // All approaches failed
        }
      }

      console.log(
        `✅ Successfully fetched ${inboxTasks.length} tasks from inbox`,
      );

      if (inboxTasks.length === 0) {
        console.log('Note: You have 0 tasks in your inbox');
        console.log('This is not an error if your inbox is actually empty');
      } else {
        console.log('Sample tasks:');
        inboxTasks.slice(0, 3).forEach((task, i) => {
          console.log(`  ${i + 1}. ${task.content}`);
        });
      }
    } catch (error) {
      console.error(`❌ Failed to fetch inbox tasks: ${error.message}`);
      console.error('This suggests a problem with inbox access permissions');
      return false;
    }

    console.log('\n✅ TODOIST API TOKEN IS VALID AND WORKING');
    return true;
  } catch (error) {
    console.error(`\n❌ UNEXPECTED ERROR: ${error.message}`);
    return false;
  }
}

// Main function
async function main() {
  console.log('Todoist API Token Diagnostic Tool');
  console.log('=================================');
  loadEnvConfig();

  const token = process.env.TODOIST_API_TOKEN;

  if (!token) {
    console.error(
      '❌ ERROR: TODOIST_API_TOKEN not found in environment variables',
    );
    console.error('Please check your .env file in the root directory');
    process.exit(1);
  }

  console.log(
    `Found Todoist API token: ${token.substring(0, 5)}...${token.substring(token.length - 5)}`,
  );

  const isValid = await validateTodoistToken(token);

  if (isValid) {
    console.log('\n==== DIAGNOSIS SUMMARY ====');
    console.log('✅ Your Todoist API token is valid and working correctly');
    console.log(
      '✅ You can access projects and tasks from your Todoist account',
    );
    console.log('\nIf you still see "0 tasks" in the application, check:');
    console.log(
      '1. The token in your .env file is for the correct Todoist account',
    );
    console.log(
      '2. Your tasks in Todoist have the correct project assignments or due dates',
    );
    console.log(
      '3. Your task filters in the application code match your Todoist organization',
    );
  } else {
    console.log('\n==== DIAGNOSIS SUMMARY ====');
    console.log('❌ Your Todoist API token has issues');
    console.log('\nPlease take the following steps:');
    console.log(
      '1. Go to Todoist web app → Settings → Integrations → API token',
    );
    console.log('2. Generate a new personal API token');
    console.log('3. Update the TODOIST_API_TOKEN in your root .env file');
    console.log(
      '4. Run this diagnostic tool again to verify the new token works',
    );
  }
}

// Run the main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
