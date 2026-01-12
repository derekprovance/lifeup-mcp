#!/usr/bin/env node

/**
 * Smoke Test Script for LifeUp MCP Server
 *
 * Performs basic connectivity and functionality checks without Vitest.
 * Useful for:
 * - Quick validation after build
 * - CI/CD smoke tests
 * - Debugging connection issues
 *
 * Usage:
 *   npm run build && npm run test:smoke
 *   DEBUG=true npm run test:smoke
 *   DEBUG=true node test-mcp.js
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const DEBUG = process.env.DEBUG === 'true';

function log(message) {
  console.log(`[test-mcp] ${message}`);
}

function error(message) {
  console.error(`[test-mcp ERROR] ${message}`);
}

async function runSmokeTests() {
  log('Starting LifeUp MCP Server smoke tests...');
  log('');

  let serverProcess = null;
  let client = null;
  let testResults = {
    startup: false,
    connection: false,
    toolListing: false,
    readOperation: false,
    createOperation: false,
  };

  try {
    // 1. Start server via StdioClientTransport
    log('Step 1: Starting MCP server...');
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['build/index.js'],
      stderr: 'pipe',
    });

    testResults.startup = true;
    log('✓ Server process started');

    // 2. Connect client
    log('Step 2: Connecting MCP client...');
    client = new Client(
      {
        name: 'test-mcp-client',
        version: '1.0.0',
      },
      { capabilities: {} }
    );

    await client.connect(transport);
    testResults.connection = true;
    log('✓ Client connected successfully');

    // Wait for server initialization
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 3. List tools
    log('Step 3: Listing available tools...');
    const toolsResponse = await client.listTools();
    testResults.toolListing = true;
    log(`✓ Server responded with ${toolsResponse.tools.length} tools`);

    if (DEBUG) {
      log('Available tools:');
      toolsResponse.tools.forEach((tool) => {
        log(`  - ${tool.name}`);
      });
    }

    // 4. Test read-only operation
    log('Step 4: Testing read-only operation (list_all_tasks)...');
    const listResponse = await client.callTool({
      name: 'list_all_tasks',
      arguments: {},
    });

    if (listResponse.isError) {
      error('list_all_tasks returned error:');
      const errorText = listResponse.content[0]?.text || 'Unknown error';
      error(errorText);

      // Check if it's a connection error
      if (errorText.match(/connection|unreachable|ECONNREFUSED|refused/i)) {
        error('');
        error('CONNECTION ERROR DETECTED');
        error('Please verify:');
        error('  1. LifeUp app is running on your Android device');
        error('  2. Cloud API is enabled in LifeUp settings');
        error('  3. LIFEUP_HOST and LIFEUP_PORT are correct in .env file');
        error('  4. Device is reachable on your network');
        error('');
      }
    } else {
      testResults.readOperation = true;
      log('✓ list_all_tasks executed successfully');
      if (DEBUG) {
        const text = listResponse.content[0]?.text || '';
        log('Response preview:');
        log(text.substring(0, 300) + (text.length > 300 ? '...' : ''));
      }
    }

    // 5. Test create operation (with cleanup)
    log('Step 5: Testing create operation (create_task)...');
    const createResponse = await client.callTool({
      name: 'create_task',
      arguments: {
        name: '[SMOKE-TEST] Test Task - Delete Me',
        coin: 10,
      },
    });

    if (createResponse.isError) {
      error('create_task returned error:');
      error(createResponse.content[0]?.text || 'Unknown error');
    } else {
      testResults.createOperation = true;
      log('✓ create_task executed successfully');

      // Extract task ID for cleanup
      const responseText = createResponse.content[0]?.text || '';
      if (DEBUG) {
        log('Full create_task response:');
        log(responseText);
      }
      const idMatch = responseText.match(/ID[:\s]+(\d+)/i);

      if (idMatch) {
        const taskId = parseInt(idMatch[1], 10);
        log(`  Created task ID: ${taskId}`);

        // Cleanup if delete_task is available
        try {
          log('  Attempting cleanup...');
          const deleteResponse = await client.callTool({
            name: 'delete_task',
            arguments: { id: taskId },
          });

          if (!deleteResponse.isError) {
            log('  ✓ Cleanup successful');
          } else {
            log('  Note: Could not delete test task (may be in SAFE_MODE)');
            log('  Please manually delete task with ID: ' + taskId);
          }
        } catch (cleanupError) {
          log('  Note: Could not delete test task (may be in SAFE_MODE)');
          log('  Please manually delete task with ID: ' + taskId);
        }
      }
    }

    // 6. Summary
    log('');
    log('='.repeat(60));
    log('SMOKE TEST SUMMARY');
    log('='.repeat(60));

    const results = [
      { name: 'Server startup', passed: testResults.startup },
      { name: 'Client connection', passed: testResults.connection },
      { name: 'Tool listing', passed: testResults.toolListing },
      { name: 'Read operation', passed: testResults.readOperation },
      { name: 'Create operation', passed: testResults.createOperation },
    ];

    results.forEach((result) => {
      const status = result.passed ? '✓' : '✗';
      log(`${status} ${result.name}`);
    });

    log('='.repeat(60));
    log('');

    const allPassed = Object.values(testResults).every((v) => v === true);

    if (allPassed) {
      log('🎉 All smoke tests passed!');
      log('The LifeUp MCP server is working correctly.');
      process.exit(0);
    } else {
      error('⚠️  Some smoke tests failed. See errors above.');
      process.exit(1);
    }
  } catch (err) {
    error('Smoke test failed with exception:');
    error(err instanceof Error ? err.message : String(err));
    if (DEBUG) {
      console.error(err);
    }
    process.exit(1);
  } finally {
    // Cleanup
    if (client) {
      try {
        await client.close();
      } catch (e) {
        // Ignore
      }
    }
  }
}

// Run tests
runSmokeTests().catch((err) => {
  error('Unhandled error:');
  console.error(err);
  process.exit(1);
});
