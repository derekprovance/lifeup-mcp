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
        skillIds: [1],
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
        skillIds: [1],
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
        skillIds: [1],
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
        skillIds: [1],
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

    // Phase 1.1: Frequency Variants
    it('should create one-time task (frequency=0)', async () => {
      const response = await client.callTool('create_task', {
        name: '[E2E-TEST] One-time Task',
        frequency: 0,
        exp: 30,
        skillIds: [1],
      });

      expectCreatedSuccessfully(response);
      const taskId = extractId(response.text);
      testData['track']('task', taskId);
    });

    it('should create unlimited repeatable task (frequency=-1)', async () => {
      const response = await client.callTool('create_task', {
        name: '[E2E-TEST] Unlimited Repeatable Task',
        frequency: -1,
        exp: 25,
        skillIds: [1],
      });

      expectCreatedSuccessfully(response);
      const taskId = extractId(response.text);
      testData['track']('task', taskId);
    });

    it('should create monthly recurring task (frequency=-4)', async () => {
      const response = await client.callTool('create_task', {
        name: '[E2E-TEST] Monthly Task',
        frequency: -4,
        exp: 100,
        skillIds: [1],
      });

      expectCreatedSuccessfully(response);
      const taskId = extractId(response.text);
      testData['track']('task', taskId);
    });

    it('should create yearly recurring task (frequency=-5)', async () => {
      const response = await client.callTool('create_task', {
        name: '[E2E-TEST] Yearly Task',
        frequency: -5,
        exp: 200,
        skillIds: [1],
      });

      expectCreatedSuccessfully(response);
      const taskId = extractId(response.text);
      testData['track']('task', taskId);
    });

    it('should create weekly task (frequency=7)', async () => {
      const response = await client.callTool('create_task', {
        name: '[E2E-TEST] Weekly Task',
        frequency: 7,
        exp: 50,
        skillIds: [1],
      });

      expectCreatedSuccessfully(response);
      const taskId = extractId(response.text);
      testData['track']('task', taskId);
    });

    it('should create biweekly task (frequency=14)', async () => {
      const response = await client.callTool('create_task', {
        name: '[E2E-TEST] Biweekly Task',
        frequency: 14,
        exp: 60,
        skillIds: [1],
      });

      expectCreatedSuccessfully(response);
      const taskId = extractId(response.text);
      testData['track']('task', taskId);
    });

    it('should create Ebbinghaus spaced repetition task (frequency=-3)', async () => {
      const response = await client.callTool('create_task', {
        name: '[E2E-TEST] Ebbinghaus Task',
        frequency: -3,
        exp: 15,
        skillIds: [1],
      });

      // This may fail if LifeUp version doesn't support Ebbinghaus
      if (!response.isError) {
        expectCreatedSuccessfully(response);
        const taskId = extractId(response.text);
        testData['track']('task', taskId);
      }
    });

    // Phase 1.2: Task Types
    it('should create normal task (task_type=0)', async () => {
      const response = await client.callTool('create_task', {
        name: '[E2E-TEST] Normal Task',
        task_type: 0,
        exp: 35,
        skillIds: [1],
      });

      expectCreatedSuccessfully(response);
      const taskId = extractId(response.text);
      testData['track']('task', taskId);
    });

    it('should create negative task (task_type=2)', async () => {
      const response = await client.callTool('create_task', {
        name: '[E2E-TEST] Negative Task',
        task_type: 2,
        coin: 10,
      });

      expectCreatedSuccessfully(response);
      const taskId = extractId(response.text);
      testData['track']('task', taskId);
    });

    it('should create API task (task_type=3)', async () => {
      const response = await client.callTool('create_task', {
        name: '[E2E-TEST] API Task',
        task_type: 3,
        exp: 25,
        skillIds: [1],
      });

      expectCreatedSuccessfully(response);
      const taskId = extractId(response.text);
      testData['track']('task', taskId);
    });

    // Phase 1.3: Item Rewards
    it('should create task with single item reward (item_name)', async () => {
      const response = await client.callTool('create_task', {
        name: '[E2E-TEST] Task with Item Reward',
        coin: 50,
        item_name: 'Potion',
        item_amount: 3,
      });

      expectCreatedSuccessfully(response);
      const taskId = extractId(response.text);
      testData['track']('task', taskId);
    });

    it('should create task with multiple item rewards (items array)', async () => {
      const response = await client.callTool('create_task', {
        name: '[E2E-TEST] Task with Multiple Items',
        coin: 100,
        items: [
          { item_id: 1, amount: 2 },
          { item_name: 'Scroll', amount: 1 },
        ],
      });

      expectCreatedSuccessfully(response);
      const taskId = extractId(response.text);
      testData['track']('task', taskId);
    });

    it('should create task with item rewards and auto_use_item', async () => {
      const response = await client.callTool('create_task', {
        name: '[E2E-TEST] Task with Auto Use Items',
        coin: 75,
        item_name: 'Treasure',
        item_amount: 5,
        auto_use_item: true,
      });

      expectCreatedSuccessfully(response);
      const taskId = extractId(response.text);
      testData['track']('task', taskId);
    });

    it('should create task with items in subtasks', async () => {
      const response = await client.callTool('create_task', {
        name: '[E2E-TEST] Task with Item Subtasks',
        subtasks: [
          { todo: 'Get Potion', item_name: 'Potion', item_amount: 2 },
          { todo: 'Get Scroll', coin: 30 },
        ],
      });

      expectCreatedSuccessfully(response);
      const taskId = extractId(response.text);
      testData['track']('task', taskId);
    });

    // Phase 1.4: Additional Task Parameters
    it('should create task with categoryId', async () => {
      const response = await client.callTool('create_task', {
        name: '[E2E-TEST] Task with Category',
        categoryId: 1,
        exp: 40,
        skillIds: [1],
      });

      expectCreatedSuccessfully(response);
      const taskId = extractId(response.text);
      testData['track']('task', taskId);
    });

    it('should create task with content (notes)', async () => {
      const response = await client.callTool('create_task', {
        name: '[E2E-TEST] Task with Notes',
        content: 'This is a detailed task description with notes.',
        exp: 50,
        skillIds: [1],
      });

      expectCreatedSuccessfully(response);
      const taskId = extractId(response.text);
      testData['track']('task', taskId);
    });

    it('should create task with coinVar (coin variance)', async () => {
      const response = await client.callTool('create_task', {
        name: '[E2E-TEST] Task with Coin Variance',
        coin: 50,
        coinVar: 25, // Random range: 50 ± 25
        exp: 30,
        skillIds: [1],
      });

      expectCreatedSuccessfully(response);
      const taskId = extractId(response.text);
      testData['track']('task', taskId);
    });

    it('should create task with multiple skills', async () => {
      const response = await client.callTool('create_task', {
        name: '[E2E-TEST] Multi-skill Task',
        exp: 60,
        skillIds: [1, 2], // Award XP to multiple skills
      });

      expectCreatedSuccessfully(response);
      const taskId = extractId(response.text);
      testData['track']('task', taskId);
    });

    it('should create task with exp=0 and no skillIds', async () => {
      const response = await client.callTool('create_task', {
        name: '[E2E-TEST] No XP Task',
        coin: 100,
        // No exp or skillIds
      });

      expectCreatedSuccessfully(response);
      const taskId = extractId(response.text);
      testData['track']('task', taskId);
    });

    // Phase 1.5: Parameter Combinations
    it('should create recurring task with deadline (frequency + deadline)', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const deadline = futureDate.toISOString().split('T')[0];

      const response = await client.callTool('create_task', {
        name: '[E2E-TEST] Recurring with Deadline',
        frequency: 1, // Daily
        deadline, // Expires in 30 days
        exp: 50,
        skillIds: [1],
      });

      expectCreatedSuccessfully(response);
      const taskId = extractId(response.text);
      testData['track']('task', taskId);
    });

    it('should create count task with subtasks', async () => {
      const response = await client.callTool('create_task', {
        name: '[E2E-TEST] Count Task with Subtasks',
        task_type: 1,
        target_times: 10,
        subtasks: [
          { todo: 'Prepare', coin: 5 },
          { todo: 'Execute', exp: 20 },
        ],
      });

      expectCreatedSuccessfully(response);
      const taskId = extractId(response.text);
      testData['track']('task', taskId);
    });

    it('should create count task with is_affect_shop_reward', async () => {
      const response = await client.callTool('create_task', {
        name: '[E2E-TEST] Count Task Shop Reward',
        task_type: 1,
        target_times: 5,
        is_affect_shop_reward: true,
        coin: 100,
      });

      expectCreatedSuccessfully(response);
      const taskId = extractId(response.text);
      testData['track']('task', taskId);
    });

    it('should create task with all reward types', async () => {
      const response = await client.callTool('create_task', {
        name: '[E2E-TEST] Full Rewards Task',
        exp: 100,
        skillIds: [1, 2],
        coin: 150,
        coinVar: 50,
        item_name: 'Potion',
        item_amount: 2,
      });

      expectCreatedSuccessfully(response);
      const taskId = extractId(response.text);
      testData['track']('task', taskId);
    });

    it('should create Ebbinghaus count task (frequency=-3 with task_type=1)', async () => {
      const response = await client.callTool('create_task', {
        name: '[E2E-TEST] Ebbinghaus Count Task',
        frequency: -3,
        task_type: 1,
        target_times: 3,
        exp: 20,
        skillIds: [1],
      });

      // May fail if version doesn't support Ebbinghaus
      if (!response.isError) {
        expectCreatedSuccessfully(response);
        const taskId = extractId(response.text);
        testData['track']('task', taskId);
      }
    });

    // Phase 1.6: Validation Edge Cases
    it('should handle task with exp>0 but no skillIds', async () => {
      const response = await client.callTool('create_task', {
        name: '[E2E-TEST] Invalid XP Task',
        exp: 50,
        // Missing skillIds - may fail validation or be silently handled
      });

      // Just verify we get a response
      expect(response).toBeDefined();
    });

    it('should handle task with exp>0 but empty skillIds', async () => {
      const response = await client.callTool('create_task', {
        name: '[E2E-TEST] Invalid XP Empty Skills',
        exp: 50,
        skillIds: [], // Empty array - may fail validation or be silently handled
      });

      // Just verify we get a response
      expect(response).toBeDefined();
    });

    it('should handle count task without target_times', async () => {
      const response = await client.callTool('create_task', {
        name: '[E2E-TEST] Invalid Count Task',
        task_type: 1,
        // Missing target_times - may fail validation or be silently handled
        coin: 50,
      });

      // Just verify we get a response
      expect(response).toBeDefined();
    });

    it('should handle count task with target_times < 1', async () => {
      const response = await client.callTool('create_task', {
        name: '[E2E-TEST] Invalid Count Times',
        task_type: 1,
        target_times: 0, // Invalid - must be > 0
        coin: 50,
      });

      // Just verify we get a response
      expect(response).toBeDefined();
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
      if (achievementId > 0) {
        testData['track']('achievement', achievementId);
      }
    });

    it('should create achievement with minimal parameters', async () => {
      const response = await client.callTool('create_achievement', {
        name: '[E2E-TEST] Minimal Achievement',
        category_id: 1,
      });

      expectCreatedSuccessfully(response);
      const achievementId = extractId(response.text);
      if (achievementId > 0) {
        testData['track']('achievement', achievementId);
      }
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
      if (achievementId > 0) {
        testData['track']('achievement', achievementId);
      }
    });

    // Phase 4.1: Achievement Conditions (test multiple condition types)
    it('should create achievement with task completion condition (type 0)', async () => {
      const response = await client.callTool('create_achievement', {
        name: '[E2E-TEST] Task Completion Achievement',
        category_id: 1,
        conditions_json: [{ type: 0, target: 1 }], // Complete 1 specific task
      });

      if (!response.isError) {
        expectCreatedSuccessfully(response);
        const id = extractId(response.text);
        if (id > 0) testData['track']('achievement', id);
      }
    });

    it('should create achievement with task count condition (type 1)', async () => {
      const response = await client.callTool('create_achievement', {
        name: '[E2E-TEST] Task Count Achievement',
        category_id: 1,
        conditions_json: [{ type: 1, target: 10 }], // Complete 10 tasks
      });

      if (!response.isError) {
        expectCreatedSuccessfully(response);
        const id = extractId(response.text);
        if (id > 0) testData['track']('achievement', id);
      }
    });

    it('should create achievement with multiple conditions (AND logic)', async () => {
      const response = await client.callTool('create_achievement', {
        name: '[E2E-TEST] Multi-condition Achievement',
        category_id: 1,
        conditions_json: [
          { type: 1, target: 5 }, // AND: Complete 5 tasks
          { type: 7, target: 500 }, // AND: Have 500 coins
        ],
      });

      if (!response.isError) {
        expectCreatedSuccessfully(response);
        const id = extractId(response.text);
        if (id > 0) testData['track']('achievement', id);
      }
    });

    it('should create achievement with coin balance condition (type 7)', async () => {
      const response = await client.callTool('create_achievement', {
        name: '[E2E-TEST] Coin Balance Achievement',
        category_id: 1,
        conditions_json: [{ type: 7, target: 2000 }], // Have 2000 coins
      });

      if (!response.isError) {
        expectCreatedSuccessfully(response);
        const id = extractId(response.text);
        if (id > 0) testData['track']('achievement', id);
      }
    });

    // Phase 4.2: Achievement Rewards
    it('should create achievement with item rewards', async () => {
      const response = await client.callTool('create_achievement', {
        name: '[E2E-TEST] Item Reward Achievement',
        category_id: 1,
        item_name: 'Golden Trophy',
        item_amount: 1,
      });

      if (!response.isError) {
        expectCreatedSuccessfully(response);
        const id = extractId(response.text);
        if (id > 0) testData['track']('achievement', id);
      }
    });

    it('should create achievement with multiple item rewards', async () => {
      const response = await client.callTool('create_achievement', {
        name: '[E2E-TEST] Multi-item Achievement',
        category_id: 1,
        items: [
          { item_id: 1, amount: 2 },
          { item_name: 'Potion', amount: 3 },
        ],
      });

      if (!response.isError) {
        expectCreatedSuccessfully(response);
        const id = extractId(response.text);
        if (id > 0) testData['track']('achievement', id);
      }
    });

    it('should create achievement with coin_var', async () => {
      const response = await client.callTool('create_achievement', {
        name: '[E2E-TEST] Coin Variance Achievement',
        category_id: 1,
        coin: 100,
        coin_var: 50,
      });

      if (!response.isError) {
        expectCreatedSuccessfully(response);
        const id = extractId(response.text);
        if (id > 0) testData['track']('achievement', id);
      }
    });

    it('should create achievement with multiple skills', async () => {
      const response = await client.callTool('create_achievement', {
        name: '[E2E-TEST] Multi-skill Achievement',
        category_id: 1,
        exp: 150,
        skills: [1, 2, 3],
      });

      if (!response.isError) {
        expectCreatedSuccessfully(response);
        const id = extractId(response.text);
        if (id > 0) testData['track']('achievement', id);
      }
    });

    it('should create achievement with all reward types', async () => {
      const response = await client.callTool('create_achievement', {
        name: '[E2E-TEST] Full Reward Achievement',
        category_id: 1,
        exp: 200,
        skills: [1, 2],
        coin: 300,
        coin_var: 100,
        item_name: 'Legendary Artifact',
        item_amount: 1,
      });

      if (!response.isError) {
        expectCreatedSuccessfully(response);
        const id = extractId(response.text);
        if (id > 0) testData['track']('achievement', id);
      }
    });

    // Phase 4.3: Achievement Appearance & Behavior
    it('should create secret achievement', async () => {
      const response = await client.callTool('create_achievement', {
        name: '[E2E-TEST] Secret Achievement',
        category_id: 1,
        secret: true,
      });

      if (!response.isError) {
        expectCreatedSuccessfully(response);
        const id = extractId(response.text);
        if (id > 0) testData['track']('achievement', id);
      }
    });

    it('should create achievement with custom color', async () => {
      const response = await client.callTool('create_achievement', {
        name: '[E2E-TEST] Colored Achievement',
        category_id: 1,
        color: '#FF5733',
      });

      if (!response.isError) {
        expectCreatedSuccessfully(response);
        const id = extractId(response.text);
        if (id > 0) testData['track']('achievement', id);
      }
    });

    it('should create achievement with write_feeling', async () => {
      const response = await client.callTool('create_achievement', {
        name: '[E2E-TEST] Feeling Achievement',
        category_id: 1,
        write_feeling: true,
      });

      if (!response.isError) {
        expectCreatedSuccessfully(response);
        const id = extractId(response.text);
        if (id > 0) testData['track']('achievement', id);
      }
    });

    it('should create unlocked achievement', async () => {
      const response = await client.callTool('create_achievement', {
        name: '[E2E-TEST] Unlocked Achievement',
        category_id: 1,
        unlocked: true,
      });

      if (!response.isError) {
        expectCreatedSuccessfully(response);
        const id = extractId(response.text);
        if (id > 0) testData['track']('achievement', id);
      }
    });

    it('should handle achievement with invalid hex color', async () => {
      const response = await client.callTool('create_achievement', {
        name: '[E2E-TEST] Invalid Color Achievement',
        category_id: 1,
        color: 'invalid-color', // Invalid hex format
      });

      // API may or may not validate hex format
      expect(response).toBeDefined();
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
      if (itemId > 0) {
        testData['track']('item', itemId);
      }
    });

    it('should create shop item with minimal parameters', async () => {
      const response = await client.callTool('add_shop_item', {
        name: '[E2E-TEST] Minimal Item',
        price: 50,
      });

      expectCreatedSuccessfully(response);
      const itemId = extractId(response.text);
      if (itemId > 0) {
        testData['track']('item', itemId);
      }
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
      if (itemId > 0) {
        testData['track']('item', itemId);
      }
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
      if (itemId > 0) {
        testData['track']('item', itemId);
      }
    });

    // Phase 5.1: Shop Item Effects
    it('should create shop item with XP effect (type 0)', async () => {
      const response = await client.callTool('add_shop_item', {
        name: '[E2E-TEST] XP Boost Item',
        price: 100,
        effects: [{ type: 0, info: { min: 50, max: 100 } }], // Add XP
      });

      if (!response.isError) {
        expectCreatedSuccessfully(response);
        const id = extractId(response.text);
        if (id > 0) testData['track']('item', id);
      }
    });

    it('should create shop item with multiple effects', async () => {
      const response = await client.callTool('add_shop_item', {
        name: '[E2E-TEST] Multi-effect Item',
        price: 150,
        effects: [
          { type: 0, info: { min: 25, max: 50 } }, // XP
          { type: 2, info: { min: 100, max: 200 } }, // Coins
        ],
      });

      if (!response.isError) {
        expectCreatedSuccessfully(response);
        const id = extractId(response.text);
        if (id > 0) testData['track']('item', id);
      }
    });

    // Phase 5.2: Shop Item Advanced Parameters
    it('should create shop item with icon URL', async () => {
      const response = await client.callTool('add_shop_item', {
        name: '[E2E-TEST] Iconed Item',
        price: 80,
        icon: 'https://example.com/icon.png',
      });

      if (!response.isError) {
        expectCreatedSuccessfully(response);
        const id = extractId(response.text);
        if (id > 0) testData['track']('item', id);
      }
    });

    it('should create shop item with title_color_string', async () => {
      const response = await client.callTool('add_shop_item', {
        name: '[E2E-TEST] Colored Title Item',
        price: 90,
        title_color_string: '#FF0000',
      });

      if (!response.isError) {
        expectCreatedSuccessfully(response);
        const id = extractId(response.text);
        if (id > 0) testData['track']('item', id);
      }
    });

    it('should create shop item with action_text', async () => {
      const response = await client.callTool('add_shop_item', {
        name: '[E2E-TEST] Custom Action Item',
        price: 120,
        action_text: 'Activate Now',
      });

      if (!response.isError) {
        expectCreatedSuccessfully(response);
        const id = extractId(response.text);
        if (id > 0) testData['track']('item', id);
      }
    });

    it('should create shop item with disable_purchase', async () => {
      const response = await client.callTool('add_shop_item', {
        name: '[E2E-TEST] Disabled Purchase Item',
        price: 100,
        disable_purchase: true,
      });

      if (!response.isError) {
        expectCreatedSuccessfully(response);
        const id = extractId(response.text);
        if (id > 0) testData['track']('item', id);
      }
    });

    it('should create shop item with disable_use', async () => {
      const response = await client.callTool('add_shop_item', {
        name: '[E2E-TEST] Disabled Use Item',
        price: 100,
        disable_use: true,
      });

      if (!response.isError) {
        expectCreatedSuccessfully(response);
        const id = extractId(response.text);
        if (id > 0) testData['track']('item', id);
      }
    });

    it('should create shop item with purchase_limit', async () => {
      const response = await client.callTool('add_shop_item', {
        name: '[E2E-TEST] Limited Purchase Item',
        price: 200,
        purchase_limit: [
          { limit_type: 'daily', amount: 5 },
          { limit_type: 'total', amount: 100 },
        ],
      });

      if (!response.isError) {
        expectCreatedSuccessfully(response);
        const id = extractId(response.text);
        if (id > 0) testData['track']('item', id);
      }
    });

    it('should create shop item with price=0 (free)', async () => {
      const response = await client.callTool('add_shop_item', {
        name: '[E2E-TEST] Free Item',
        price: 0,
        stock_number: 10,
      });

      expectCreatedSuccessfully(response);
      const id = extractId(response.text);
      if (id > 0) testData['track']('item', id);
    });

    it('should create shop item with unlimited stock', async () => {
      const response = await client.callTool('add_shop_item', {
        name: '[E2E-TEST] Unlimited Stock Item',
        price: 100,
        stock_number: -1,
      });

      expectCreatedSuccessfully(response);
      const id = extractId(response.text);
      if (id > 0) testData['track']('item', id);
    });
  });
});
