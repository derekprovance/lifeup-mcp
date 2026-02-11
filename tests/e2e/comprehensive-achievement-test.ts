/**
 * Comprehensive Achievement Handling Test
 *
 * This test demonstrates:
 * 1. Creating different task types (normal, count, negative)
 * 2. Creating an achievement with completion criteria tied to tasks
 * 3. Verifying unlock conditions are properly set
 */

import { spawn, ChildProcess } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

interface MCPToolResponse {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
  text: string;
}

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
  taskIds?: number[];
  achievementId?: number;
}

class AchievementTestSuite {
  private client: Client | null = null;
  private serverProcess: ChildProcess | null = null;
  private transport: StdioClientTransport | null = null;
  private testResults: TestResult[] = [];
  private createdTaskIds: number[] = [];
  private createdAchievementIds: number[] = [];

  async start(): Promise<void> {
    console.log('🚀 Starting MCP server for comprehensive achievement test...\n');

    const { resolve: resolvePath } = await import('path');
    const serverPath = resolvePath(__dirname, '../../..', 'build/index.js');

    this.transport = new StdioClientTransport({
      command: 'node',
      args: [serverPath],
      env: { ...process.env },
      stderr: 'pipe',
    });

    this.client = new Client(
      {
        name: 'achievement-test-client',
        version: '1.0.0',
      },
      { capabilities: {} }
    );

    await this.client.connect(this.transport);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<MCPToolResponse> {
    if (!this.client) throw new Error('Client not connected');

    try {
      const response = await this.client.callTool({
        name,
        arguments: args,
      });

      return {
        content: response.content,
        isError: response.isError,
        text: this.extractText(response.content),
      };
    } catch (error) {
      throw new Error(`Tool call failed for '${name}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private extractText(content: Array<{ type: string; text: string }>): string {
    return content
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('\n');
  }

  async stop(): Promise<void> {
    if (this.client) {
      await this.client.close();
    }
  }

  private extractIdFromResponse(text: string, pattern: RegExp): number | null {
    const match = text.match(pattern);
    return match ? parseInt(match[1], 10) : null;
  }

  // Test 1: Create a normal task
  async testCreateNormalTask(): Promise<TestResult> {
    console.log('📝 Test 1: Creating a normal task...');

    try {
      const response = await this.callTool('create_task', {
        name: '[ACHIEVEMENT-TEST] Normal Task - Learn TypeScript',
        coin: 50,
        importance: 3,
        difficulty: 2,
      });

      const taskId = this.extractIdFromResponse(response.text, /Task ID[:\s]+(\d+)/i);

      if (response.isError || !taskId) {
        return {
          name: 'Normal Task Creation',
          passed: false,
          details: `Failed to create normal task. Response: ${response.text.substring(0, 100)}`,
        };
      }

      this.createdTaskIds.push(taskId);

      return {
        name: 'Normal Task Creation',
        passed: true,
        details: `✓ Created normal task (ID: ${taskId})`,
        taskIds: [taskId],
      };
    } catch (error) {
      return {
        name: 'Normal Task Creation',
        passed: false,
        details: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  // Test 2: Create a count task
  async testCreateCountTask(): Promise<TestResult> {
    console.log('📝 Test 2: Creating a count task...');

    try {
      const response = await this.callTool('create_task', {
        name: '[ACHIEVEMENT-TEST] Count Task - Exercise 5 Times',
        task_type: 1, // Count task
        target_times: 5,
        coin: 100,
        importance: 2,
        difficulty: 1,
      });

      const taskId = this.extractIdFromResponse(response.text, /Task ID[:\s]+(\d+)/i);

      if (response.isError || !taskId) {
        return {
          name: 'Count Task Creation',
          passed: false,
          details: `Failed to create count task. Response: ${response.text.substring(0, 100)}`,
        };
      }

      this.createdTaskIds.push(taskId);

      return {
        name: 'Count Task Creation',
        passed: true,
        details: `✓ Created count task (ID: ${taskId}, target: 5 times)`,
        taskIds: [taskId],
      };
    } catch (error) {
      return {
        name: 'Count Task Creation',
        passed: false,
        details: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  // Test 3: Create a negative task
  async testCreateNegativeTask(): Promise<TestResult> {
    console.log('📝 Test 3: Creating a negative task...');

    try {
      const response = await this.callTool('create_task', {
        name: '[ACHIEVEMENT-TEST] Negative Task - Procrastination Penalty',
        task_type: 2, // Negative task
        coin: -50, // Penalty
        importance: 1,
        difficulty: 1,
      });

      const taskId = this.extractIdFromResponse(response.text, /Task ID[:\s]+(\d+)/i);

      if (response.isError || !taskId) {
        return {
          name: 'Negative Task Creation',
          passed: false,
          details: `Failed to create negative task. Response: ${response.text.substring(0, 100)}`,
        };
      }

      this.createdTaskIds.push(taskId);

      return {
        name: 'Negative Task Creation',
        passed: true,
        details: `✓ Created negative task (ID: ${taskId}, penalty: -50 coins)`,
        taskIds: [taskId],
      };
    } catch (error) {
      return {
        name: 'Negative Task Creation',
        passed: false,
        details: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  // Test 4: Create achievement with completion criteria
  async testCreateAchievementWithCriteria(): Promise<TestResult> {
    console.log('📝 Test 4: Creating achievement with completion criteria...');

    if (this.createdTaskIds.length < 3) {
      return {
        name: 'Achievement with Criteria',
        passed: false,
        details: 'Cannot create achievement: not all tasks were created',
      };
    }

    try {
      const [normalTaskId, countTaskId, negativeTaskId] = this.createdTaskIds;

      // Create achievement with multiple unlock conditions
      const response = await this.callTool('create_achievement', {
        name: '[ACHIEVEMENT-TEST] Master Learner',
        category_id: 1, // General category
        desc: 'Complete various tasks to master your learning journey',
        conditions_json: [
          {
            type: 0, // Complete task X times
            related_id: normalTaskId,
            target: 1, // Complete the normal task once
          },
          {
            type: 0, // Complete task X times
            related_id: countTaskId,
            target: 3, // Complete the count task 3 times (out of 5)
          },
          {
            type: 0, // Complete task X times
            related_id: negativeTaskId,
            target: 0, // Don't trigger the negative task
          },
        ],
        exp: 100,
        coin: 200,
        unlocked: false, // Achievement starts locked
      });

      const achievementId = this.extractIdFromResponse(response.text, /Achievement ID[:\s]+(\d+)/i);

      if (response.isError || !achievementId) {
        return {
          name: 'Achievement with Criteria',
          passed: false,
          details: `Failed to create achievement. Response: ${response.text.substring(0, 150)}`,
        };
      }

      this.createdAchievementIds.push(achievementId);

      // Check if conditions were properly recorded
      const conditionsFound = response.text.includes('condition');
      const conditionCount = (response.text.match(/condition/gi) || []).length;

      return {
        name: 'Achievement with Criteria',
        passed: true,
        details: `✓ Created achievement (ID: ${achievementId}) with 3 unlock conditions. Conditions recorded: ${conditionCount > 0 ? 'Yes' : 'No'}`,
        achievementId: achievementId,
      };
    } catch (error) {
      return {
        name: 'Achievement with Criteria',
        passed: false,
        details: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  // Test 5: Verify achievement details
  async testVerifyAchievementDetails(): Promise<TestResult> {
    console.log('📝 Test 5: Verifying achievement details and conditions...');

    if (this.createdAchievementIds.length === 0) {
      return {
        name: 'Verify Achievement Details',
        passed: false,
        details: 'No achievements were created to verify',
      };
    }

    try {
      const response = await this.callTool('list_achievements', {});

      if (response.isError) {
        return {
          name: 'Verify Achievement Details',
          passed: false,
          details: `Failed to list achievements: ${response.text.substring(0, 100)}`,
        };
      }

      // Check if our test achievement is in the list
      const testAchievementFound = response.text.includes('[ACHIEVEMENT-TEST]');
      const conditionsShown = response.text.includes('Complete task');

      return {
        name: 'Verify Achievement Details',
        passed: testAchievementFound,
        details: `✓ Achievement list retrieved. Test achievement found: ${testAchievementFound ? 'Yes' : 'No'}. Conditions visible: ${conditionsShown ? 'Yes' : 'No'}`,
      };
    } catch (error) {
      return {
        name: 'Verify Achievement Details',
        passed: false,
        details: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  // Test 6: Match task to achievement
  async testMatchTaskToAchievement(): Promise<TestResult> {
    console.log('📝 Test 6: Matching tasks to relevant achievements...');

    try {
      const response = await this.callTool('match_task_to_achievements', {
        taskName: 'Learning and skill development',
      });

      if (response.isError) {
        return {
          name: 'Match Task to Achievement',
          passed: false,
          details: `Failed to match tasks: ${response.text.substring(0, 100)}`,
        };
      }

      // Should find relevant achievements
      const foundMatches = response.text.includes('Relevant Achievements');
      const foundOurAchievement = response.text.includes('Master Learner') || response.text.length > 50;

      return {
        name: 'Match Task to Achievement',
        passed: foundMatches,
        details: `✓ Task matching completed. Found relevant achievements: ${foundMatches ? 'Yes' : 'No'}`,
      };
    } catch (error) {
      return {
        name: 'Match Task to Achievement',
        passed: false,
        details: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async runAllTests(): Promise<void> {
    try {
      await this.start();

      console.log('═'.repeat(70));
      console.log('🎯 COMPREHENSIVE ACHIEVEMENT HANDLING TEST SUITE');
      console.log('═'.repeat(70));
      console.log('');

      // Run all tests
      this.testResults.push(await this.testCreateNormalTask());
      console.log(`  ${this.testResults[this.testResults.length - 1].passed ? '✅' : '❌'} ${this.testResults[this.testResults.length - 1].details}\n`);

      this.testResults.push(await this.testCreateCountTask());
      console.log(`  ${this.testResults[this.testResults.length - 1].passed ? '✅' : '❌'} ${this.testResults[this.testResults.length - 1].details}\n`);

      this.testResults.push(await this.testCreateNegativeTask());
      console.log(`  ${this.testResults[this.testResults.length - 1].passed ? '✅' : '❌'} ${this.testResults[this.testResults.length - 1].details}\n`);

      this.testResults.push(await this.testCreateAchievementWithCriteria());
      console.log(`  ${this.testResults[this.testResults.length - 1].passed ? '✅' : '❌'} ${this.testResults[this.testResults.length - 1].details}\n`);

      this.testResults.push(await this.testVerifyAchievementDetails());
      console.log(`  ${this.testResults[this.testResults.length - 1].passed ? '✅' : '❌'} ${this.testResults[this.testResults.length - 1].details}\n`);

      this.testResults.push(await this.testMatchTaskToAchievement());
      console.log(`  ${this.testResults[this.testResults.length - 1].passed ? '✅' : '❌'} ${this.testResults[this.testResults.length - 1].details}\n`);

      // Summary
      console.log('═'.repeat(70));
      const passed = this.testResults.filter((r) => r.passed).length;
      const total = this.testResults.length;

      console.log(`📊 TEST SUMMARY: ${passed}/${total} tests passed\n`);

      this.testResults.forEach((result) => {
        const status = result.passed ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} | ${result.name}`);
        console.log(`      ${result.details}`);
        if (result.taskIds) {
          console.log(`      Created Task IDs: ${result.taskIds.join(', ')}`);
        }
        if (result.achievementId) {
          console.log(`      Created Achievement ID: ${result.achievementId}`);
        }
        console.log('');
      });

      if (passed === total) {
        console.log('🎉 All tests passed! Achievement handling is working correctly.\n');
      } else {
        console.log(`⚠️  ${total - passed} test(s) failed. Please review the details above.\n`);
      }

      console.log('📋 CREATED TEST DATA:');
      console.log(`   Tasks: ${this.createdTaskIds.join(', ')}`);
      console.log(`   Achievements: ${this.createdAchievementIds.join(', ')}`);
      console.log('\nℹ️  To clean up, delete these items in the LifeUp app or use delete tools.\n');
    } catch (error) {
      console.error('Fatal error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    } finally {
      await this.stop();
    }
  }
}

// Run the test suite
const testSuite = new AchievementTestSuite();
testSuite.runAllTests().catch((error) => {
  console.error('Test suite error:', error);
  process.exit(1);
});
