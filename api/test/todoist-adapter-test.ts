/**
 * Test for TodoistAdapter
 * Demonstrates working task retrieval using the adapter
 */
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { TodoistAdapter } from '../lib/core/services/todoist-adapter';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env') });

// Get token
const token = process.env.TODOIST_API_TOKEN;
if (!token) {
  console.error('ERROR: TODOIST_API_TOKEN not found in environment');
  process.exit(1);
}

async function testAdapter() {
  console.log('=== Testing TodoistAdapter ===');

  try {
    // Create adapter instance
    if (!token) throw new Error('TODOIST_API_TOKEN is required');
    const adapter = new TodoistAdapter(token);

    // 1. Test projects
    console.log('\n1. Testing projects...');
    const projects = await adapter.getProjects();
    console.log(`Found ${projects.length} projects`);

    if (projects.length > 0) {
      console.log('First 3 projects:');
      projects
        .slice(0, 3)
        .forEach((p) => console.log(`- ${p.name} (ID: ${p.id})`));
    }

    // 2. Test tasks
    console.log('\n2. Testing tasks retrieval...');
    const tasks = await adapter.getTasks();
    console.log(`Found ${tasks.length} tasks`);

    if (tasks.length > 0) {
      console.log('First 5 tasks:');
      tasks
        .slice(0, 5)
        .forEach((t) =>
          console.log(`- ${t.content} (Project: ${t.projectId})`),
        );
    }

    // 3. Test tasks with deep links
    console.log('\n3. Testing tasks with deep links...');
    const tasksWithLinks = await adapter.getTasksWithDeepLinks();

    if (tasksWithLinks.length > 0) {
      console.log('First 3 tasks with deep links:');
      tasksWithLinks
        .slice(0, 3)
        .forEach((t) =>
          console.log(`- ${t.content} [View Task](${t.deepLink})`),
        );
    }

    // Summary
    console.log('\nSummary:');
    console.log(`- Projects found: ${projects.length}`);
    console.log(`- Tasks found: ${tasks.length}`);
    console.log('Adapter is working correctly!');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the test
testAdapter().catch(console.error);
