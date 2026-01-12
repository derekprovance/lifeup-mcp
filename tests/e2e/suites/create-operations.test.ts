import { describe, it, beforeAll, afterAll } from 'vitest';
import { MCPTestClient } from '../helpers/mcp-client';
import { TestDataManager } from '../helpers/test-data-manager';
import { expectSuccess, expectCreatedSuccessfully, extractId } from '../helpers/assertions';

/**
 * Create Operations E2E Tests
 *
 * Tests create tools that add new data to LifeUp without modification.
 * All created data is automatically cleaned up after tests complete.
 *
 * Coverage:
 * - create_task (5 variants: basic, with frequency, count task, with subtasks, with deadline)
 * - create_achievement (2 variants: basic, with conditions)
 * - add_shop_item (2 variants: basic, with effects)
 *
 * Total: 3 create tools with multiple variants tested
 */
describe('Create Operations', () => {
  let client: MCPTestClient;
  let testData: TestDataManager;

  beforeAll(async () => {
    client = new MCPTestClient();
    await client.start();
    testData = new TestDataManager(client);
  });

  afterAll(async () => {
    await testData.cleanup();
    await client.stop();
  });

  describe('create_task', () => {
    it('should create basic task', async () => {
      const response = await client.callTool('create_task', {
        name: '[E2E-TEST] Basic Task',
        exp: 50,
        coin: 25,
        skillIds: [1],
      });

      expectCreatedSuccessfully(response);
      // Extract ID for tracking
      const taskId = extractId(response.text);
      testData['track']('task', taskId); // Track for cleanup
    });

    it('should create task with frequency (daily)', async () => {
      const response = await client.callTool('create_task', {
        name: '[E2E-TEST] Daily Task',
        frequency: 1,
        exp: 30,
      });

      expectCreatedSuccessfully(response);
      const taskId = extractId(response.text);
      testData['track']('task', taskId);
    });

    it('should create task with frequency (every 3 days)', async () => {
      const response = await client.callTool('create_task', {
        name: '[E2E-TEST] Every 3 Days Task',
        frequency: 3,
        exp: 40,
      });

      expectCreatedSuccessfully(response);
      const taskId = extractId(response.text);
      testData['track']('task', taskId);
    });

    it('should create count task (repeatable)', async () => {
      const response = await client.callTool('create_task', {
        name: '[E2E-TEST] Count Task',
        task_type: 1,
        target_times: 5,
        exp: 20,
      });

      expectCreatedSuccessfully(response);
      const taskId = extractId(response.text);
      testData['track']('task', taskId);
    });

    it('should create task with subtasks', async () => {
      const response = await client.callTool('create_task', {
        name: '[E2E-TEST] Task with Subtasks',
        subtasks: [
          { todo: 'Subtask 1', exp: 10 },
          { todo: 'Subtask 2', coin: 5 },
          { todo: 'Subtask 3', exp: 15 },
        ],
      });

      expectCreatedSuccessfully(response);
      const taskId = extractId(response.text);
      testData['track']('task', taskId);
    });

    it('should create task with deadline', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const deadline = futureDate.toISOString().split('T')[0];

      const response = await client.callTool('create_task', {
        name: '[E2E-TEST] Task with Deadline',
        deadline,
        exp: 100,
      });

      expectCreatedSuccessfully(response);
      const taskId = extractId(response.text);
      testData['track']('task', taskId);
    });

    it('should create task with auto_use_item', async () => {
      const response = await client.callTool('create_task', {
        name: '[E2E-TEST] Task with Auto Use Item',
        auto_use_item: true,
        coin: 50,
      });

      expectCreatedSuccessfully(response);
      const taskId = extractId(response.text);
      testData['track']('task', taskId);
    });
  });

  describe('create_achievement', () => {
    it('should create basic achievement', async () => {
      const response = await client.callTool('create_achievement', {
        name: '[E2E-TEST] Test Achievement',
        category_id: 1,
        desc: 'Test achievement description',
        exp: 100,
        coin: 50,
        skills: [1],
      });

      expectCreatedSuccessfully(response);
      const achievementId = extractId(response.text);
      testData['track']('achievement', achievementId);
    });

    it('should create achievement with minimal parameters', async () => {
      const response = await client.callTool('create_achievement', {
        name: '[E2E-TEST] Minimal Achievement',
        category_id: 1,
      });

      expectCreatedSuccessfully(response);
      const achievementId = extractId(response.text);
      testData['track']('achievement', achievementId);
    });

    it('should create achievement with conditions', async () => {
      const response = await client.callTool('create_achievement', {
        name: '[E2E-TEST] Conditional Achievement',
        category_id: 1,
        desc: 'Achievement with unlock conditions',
        conditions_json: [{ type: 7, target: 1000 }], // 1000 coins
      });

      expectCreatedSuccessfully(response);
      const achievementId = extractId(response.text);
      testData['track']('achievement', achievementId);
    });
  });

  describe('add_shop_item', () => {
    it('should create basic shop item', async () => {
      const response = await client.callTool('add_shop_item', {
        name: '[E2E-TEST] Test Item',
        desc: 'Test item description',
        price: 100,
        stock_number: 10,
      });

      expectCreatedSuccessfully(response);
      const itemId = extractId(response.text);
      testData['track']('item', itemId);
    });

    it('should create shop item with minimal parameters', async () => {
      const response = await client.callTool('add_shop_item', {
        name: '[E2E-TEST] Minimal Item',
        price: 50,
      });

      expectCreatedSuccessfully(response);
      const itemId = extractId(response.text);
      testData['track']('item', itemId);
    });

    it('should create shop item with category', async () => {
      const response = await client.callTool('add_shop_item', {
        name: '[E2E-TEST] Categorized Item',
        price: 200,
        category: 1,
        stock_number: 5,
      });

      expectCreatedSuccessfully(response);
      const itemId = extractId(response.text);
      testData['track']('item', itemId);
    });

    it('should create shop item with effects', async () => {
      const response = await client.callTool('add_shop_item', {
        name: '[E2E-TEST] Coin Boost',
        price: 75,
        desc: 'Boosts coins when purchased',
        effects: [
          {
            type: 2, // Increase coins
            info: { min: 100, max: 200 },
          },
        ],
      });

      expectCreatedSuccessfully(response);
      const itemId = extractId(response.text);
      testData['track']('item', itemId);
    });
  });
});
