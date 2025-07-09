/**
 * Todoist API Debug Utility
 * This script helps debug Todoist API access and filter issues
 */

import { TodoistApi } from '@doist/todoist-api-typescript';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

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

// Main debug function
async function debugTodoistApi() {
  console.log('Starting Todoist API Debug...');
  loadEnvConfig();

  const todoistToken = process.env.TODOIST_API_TOKEN;
  if (!todoistToken) {
    console.error(
      '❌ ERROR: TODOIST_API_TOKEN not found in environment variables',
    );
    return;
  }

  console.log('✅ TODOIST_API_TOKEN found in environment');

  try {
    console.log('Initializing Todoist API client...');
    const api = new TodoistApi(todoistToken);

    // 1. Basic API connection test
    console.log('\n==== TESTING API CONNECTION ====');
    try {
      const projects = (await api.getProjects()) as unknown as TodoistProject[];
      console.log(
        `✅ Successfully connected to Todoist API and fetched ${projects.length} projects`,
      );

      // Display project names
      console.log('\nProjects:');
      projects.forEach((project, index) => {
        console.log(`  ${index + 1}. ${project.name} (ID: ${project.id})`);
      });
    } catch (error) {
      console.error('❌ Error fetching projects:', error.message);
    }

    // 2. Test task retrieval with different methods
    console.log('\n==== TESTING TASK RETRIEVAL ====');

    // 2.1 Basic getTasks (no filter)
    try {
      console.log('\nBasic getTasks() - no filter:');
      const tasks = (await api.getTasks()) as unknown as TodoistTask[];
      console.log(`Retrieved ${tasks.length} tasks`);

      if (tasks.length > 0) {
        console.log('Sample tasks (up to 3):');
        tasks.slice(0, 3).forEach((task, index) => {
          console.log(`  ${index + 1}. ${task.content}`);
        });
      }
    } catch (error) {
      console.error('❌ Error with basic getTasks():', error.message);
    }

    // 2.2 Using different filters
    const filters = [
      { name: 'Today filter', query: 'today' },
      { name: 'Inbox filter', query: '#inbox' },
      { name: 'Inbox filter (alt)', query: 'no project' },
      { name: 'Today filter (alt)', query: 'due:today' },
      { name: 'Priority filter', query: 'p1' },
      { name: 'All tasks filter', query: 'view all' },
    ];

    for (const filter of filters) {
      try {
        console.log(`\nTesting filter: "${filter.query}" (${filter.name})`);
        const result = await api.getTasksByFilter({
          query: filter.query,
          limit: 100,
        });

        // Handle different response formats
        let tasks: TodoistTask[] = [];

        if (Array.isArray(result)) {
          tasks = result as TodoistTask[];
        } else if (result && typeof result === 'object') {
          if ('items' in result && Array.isArray((result as any).items)) {
            tasks = (result as any).items as TodoistTask[];
          }
        }

        console.log(
          `Retrieved ${tasks.length} tasks with filter "${filter.query}"`,
        );

        if (tasks.length > 0) {
          console.log('Sample tasks (up to 3):');
          tasks.slice(0, 3).forEach((task, index) => {
            const dueInfo = task.due ? ` (due: ${task.due.date})` : '';
            console.log(`  ${index + 1}. ${task.content}${dueInfo}`);
          });
        }
      } catch (error) {
        console.error(`❌ Error with filter "${filter.query}":`, error.message);
      }
    }

    // 3. Test project-specific task retrieval
    console.log('\n==== TESTING PROJECT-SPECIFIC TASKS ====');
    try {
      const projects = (await api.getProjects()) as unknown as TodoistProject[];

      // Only test up to 3 projects to avoid overwhelming output
      for (const project of projects.slice(0, Math.min(3, projects.length))) {
        console.log(`\nFetching tasks for project: "${project.name}"`);

        // Using getTasksByFilter with project filter
        try {
          const projectFilter = `#${project.name}`;
          const result = await api.getTasksByFilter({
            query: projectFilter,
            limit: 100,
          });

          // Handle different response formats
          let tasks: TodoistTask[] = [];

          if (Array.isArray(result)) {
            tasks = result as TodoistTask[];
          } else if (result && typeof result === 'object') {
            if ('items' in result && Array.isArray((result as any).items)) {
              tasks = (result as any).items as TodoistTask[];
            }
          }

          console.log(
            `Retrieved ${tasks.length} tasks for project "${project.name}" using filter`,
          );

          if (tasks.length > 0) {
            console.log('Sample tasks (up to 3):');
            tasks.slice(0, 3).forEach((task, index) => {
              console.log(`  ${index + 1}. ${task.content}`);
            });
          }
        } catch (error) {
          console.error(
            `❌ Error fetching tasks for project "${project.name}" using filter:`,
            error.message,
          );
        }

        // Using getTasks with projectId filter
        try {
          const projectTasks = (await api.getTasks({
            projectId: project.id,
          })) as unknown as TodoistTask[];
          console.log(
            `Retrieved ${projectTasks.length} tasks for project "${project.name}" using projectId`,
          );

          if (projectTasks.length > 0) {
            console.log('Sample tasks (up to 3):');
            projectTasks.slice(0, 3).forEach((task, index) => {
              console.log(`  ${index + 1}. ${task.content}`);
            });
          }
        } catch (error) {
          console.error(
            `❌ Error fetching tasks for project "${project.name}" using projectId:`,
            error.message,
          );
        }
      }
    } catch (error) {
      console.error(
        '❌ Error in project-specific task testing:',
        error.message,
      );
    }

    console.log('\n==== TODOIST API DEBUG COMPLETED ====');
    console.log('If you are still seeing 0 tasks, check:');
    console.log('1. Your Todoist token has correct permissions/scopes');
    console.log('2. Your token has access to the correct Todoist account');
    console.log('3. Your tasks are correctly labeled/assigned in Todoist');
    console.log('4. Your API key is valid and not expired');
  } catch (error) {
    console.error('❌ FATAL ERROR:', error.message);
  }
}

// Run the debug function
debugTodoistApi().catch((error) => {
  console.error('Unexpected error during Todoist API debug:', error);
});
