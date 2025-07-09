/**
 * Todoist API Test Script
 * Diagnostic tool for troubleshooting Todoist API connectivity
 */
import { TodoistApiService } from './services/todoist-api.service';

async function runTest() {
  console.log('=== Todoist API Diagnostic Tool ===\n');
  
  try {
    // Create service instance
    const todoistService = new TodoistApiService();
    
    // Test basic connectivity
    console.log('Testing API connection...');
    const connectionTest = await todoistService.testConnection();
    
    if (connectionTest.success) {
      console.log('✓', connectionTest.message);
      
      if (connectionTest.projects.length > 0) {
        console.log('\nProjects:');
        connectionTest.projects.forEach((p: any) => console.log(`- ${p.name} (ID: ${p.id})`));
      }
    } else {
      console.error('✗', connectionTest.message);
      throw new Error('Connection test failed');
    }
    
    // Test getting tasks with advanced diagnostics
    console.log('\nFetching tasks with diagnostics...');
    const tasksResult = await todoistService.getTasksWithDiagnostics();
    
    if (tasksResult.success) {
      console.log(`✓ Found ${tasksResult.count} tasks using '${tasksResult.method}' method`);
      
      if (tasksResult.tasks.length > 0) {
        console.log('\nSample tasks:');
        tasksResult.tasks.slice(0, 3).forEach((t: any) => {
          console.log(`- ${t.content} (Project: ${t.projectId})`);
        });
      }
    } else {
      console.log(`✗ No tasks found. Method used: ${tasksResult.method}`);
      
      if (tasksResult.diagnostics) {
        console.log('\nDiagnostic Information:');
        console.log(`- Projects found: ${tasksResult.diagnostics.projectCount}`);
        console.log('- API endpoint:', tasksResult.diagnostics.apiEndpoint);
        console.log('- Possible issues:');
        tasksResult.diagnostics.possibleIssues.forEach((issue: string) => console.log(`  • ${issue}`));
      }
      
      if (tasksResult.error) {
        console.log('\nError details:');
        console.log('- Message:', tasksResult.error.message);
        console.log('- Status:', tasksResult.error.status || 'N/A');
      }
    }
    
    console.log('\n=== Test complete ===');
    
  } catch (error: any) {
    console.error('\nTest failed:', error.message);
  }
}

// Run the test
runTest().catch(console.error);
