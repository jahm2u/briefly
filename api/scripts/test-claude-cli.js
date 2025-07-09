#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('=== Claude CLI Debugging Test ===');
console.log(`Running as user: ${process.env.USER || 'unknown'}`);
console.log(`Current directory: ${process.cwd()}`);
console.log(`Node version: ${process.version}`);
console.log('');

// Test 1: Basic Claude CLI availability
function testClaudeAvailability() {
  return new Promise((resolve) => {
    console.log('Test 1: Checking Claude CLI availability...');
    
    const which = spawn('which', ['claude']);
    let output = '';
    
    which.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    which.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Claude CLI found at: ${output.trim()}`);
      } else {
        console.log('❌ Claude CLI not found in PATH');
      }
      resolve(code === 0);
    });
  });
}

// Test 2: Claude CLI version
function testClaudeVersion() {
  return new Promise((resolve) => {
    console.log('\nTest 2: Checking Claude CLI version...');
    
    const version = spawn('claude', ['--version']);
    let output = '';
    let error = '';
    
    version.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    version.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    version.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Claude CLI version: ${output.trim()}`);
      } else {
        console.log(`❌ Failed to get version (code: ${code})`);
        console.log(`Error: ${error}`);
      }
      resolve(code === 0);
    });
  });
}

// Test 3: Check if Claude CLI is ready (no auth command exists)
function testClaudeReady() {
  return new Promise((resolve) => {
    console.log('\nTest 3: Checking if Claude CLI is ready...');
    
    const help = spawn('claude', ['--help']);
    let output = '';
    let error = '';
    
    help.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    help.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    help.on('close', (code) => {
      if (code === 0 && output.includes('Claude Code')) {
        console.log(`✅ Claude CLI is ready and responsive`);
      } else {
        console.log(`❌ Claude CLI help failed (code: ${code})`);
        console.log(`Output: ${output.substring(0, 200)}...`);
        console.log(`Error: ${error}`);
      }
      resolve(code === 0);
    });
  });
}

// Test 4: Simple command
function testSimpleCommand() {
  return new Promise((resolve) => {
    console.log('\nTest 4: Testing simple Claude command...');
    
    const claude = spawn('claude', ['what is 2+2?'], {
      timeout: 30000
    });
    
    let stdout = '';
    let stderr = '';
    
    claude.stdout.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;
      console.log(`STDOUT chunk: ${chunk.substring(0, 100)}...`);
    });
    
    claude.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;
      console.log(`STDERR: ${chunk}`);
    });
    
    claude.on('close', (code) => {
      console.log(`Process closed with code: ${code}`);
      if (code === 0) {
        console.log(`✅ Simple command succeeded`);
        console.log(`Response length: ${stdout.length} chars`);
      } else {
        console.log(`❌ Simple command failed (code: ${code})`);
        console.log(`STDOUT: ${stdout}`);
        console.log(`STDERR: ${stderr}`);
      }
      resolve(code === 0);
    });
    
    claude.on('error', (error) => {
      console.log(`❌ Process error: ${error.message}`);
      resolve(false);
    });
    
    // Kill after 30 seconds
    setTimeout(() => {
      console.log('⏰ Timeout reached, killing process...');
      claude.kill('SIGTERM');
    }, 30000);
  });
}

// Test 5: Command with our flags
function testWithFlags() {
  return new Promise((resolve) => {
    console.log('\nTest 5: Testing with production flags...');
    
    const claude = spawn('claude', [
      '-p', 
      '--output-format', 'json', 
      '--max-turns', '1', 
      '--dangerously-skip-permissions', 
      'hello world'
    ], {
      cwd: path.join(process.cwd(), '..'),
      timeout: 60000
    });
    
    let stdout = '';
    let stderr = '';
    
    claude.stdout.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;
      console.log(`STDOUT chunk: ${chunk.substring(0, 200)}...`);
    });
    
    claude.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;
      console.log(`STDERR: ${chunk}`);
    });
    
    claude.on('close', (code) => {
      console.log(`Process closed with code: ${code}`);
      if (code === 0) {
        console.log(`✅ Flagged command succeeded`);
        console.log(`Response length: ${stdout.length} chars`);
      } else {
        console.log(`❌ Flagged command failed (code: ${code})`);
        console.log(`STDOUT: ${stdout}`);
        console.log(`STDERR: ${stderr}`);
      }
      resolve(code === 0);
    });
    
    claude.on('error', (error) => {
      console.log(`❌ Process error: ${error.message}`);
      resolve(false);
    });
    
    // Kill after 60 seconds
    setTimeout(() => {
      console.log('⏰ Timeout reached, killing process...');
      claude.kill('SIGTERM');
    }, 60000);
  });
}

// Run all tests
async function runTests() {
  console.log('Starting Claude CLI diagnostic tests...\n');
  
  const results = {
    availability: await testClaudeAvailability(),
    version: await testClaudeVersion(),
    ready: await testClaudeReady(),
    simple: await testSimpleCommand(),
    flags: await testWithFlags()
  };
  
  console.log('\n=== Test Results Summary ===');
  console.log(`Claude CLI Available: ${results.availability ? '✅' : '❌'}`);
  console.log(`Version Check: ${results.version ? '✅' : '❌'}`);
  console.log(`CLI Ready: ${results.ready ? '✅' : '❌'}`);
  console.log(`Simple Command: ${results.simple ? '✅' : '❌'}`);
  console.log(`Production Flags: ${results.flags ? '✅' : '❌'}`);
  
  const passCount = Object.values(results).filter(Boolean).length;
  console.log(`\nTotal: ${passCount}/5 tests passed`);
  
  if (passCount === 5) {
    console.log('🎉 All tests passed! Claude CLI should work in production.');
  } else {
    console.log('⚠️  Some tests failed. Check the output above for details.');
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});

// Run the tests
runTests().catch(console.error);