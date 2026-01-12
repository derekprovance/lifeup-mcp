import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { MCPTestClient } from '../helpers/mcp-client';
import { TestDataManager } from '../helpers/test-data-manager';
import { expectSuccess, expectSafeModeBlocked } from '../helpers/assertions';

/**
 * SAFE_MODE Enforcement E2E Tests
 *
 * Tests that SAFE_MODE properly blocks edit/delete operations while allowing
 * read and create operations. Runs two test suites with different modes.
 *
 * SAFE_MODE=true should:
 * - List only 17 tools (14 read + 3 create)
 * - Block all 8 edit/delete tools
 *
 * SAFE_MODE=false should:
 * - List all 25 tools
 * - Allow all edit/delete operations
 */

describe('SAFE_MODE=true (Restrictive Mode)', () => {
  let client: MCPTestClient;
  let testData: TestDataManager;

  beforeAll(async () => {
    // Start server with SAFE_MODE=true
    client = new MCPTestClient();
    await client.start({ SAFE_MODE: 'true' });
    testData = new TestDataManager(client);
  });

  afterAll(async () => {
    await testData.cleanup();
    await client.stop();
  });

  it('should list only 18 tools (15 read + 3 create)', async () => {
    const tools = await client.listTools();

    expect(tools.length).toBe(18);
  });

  it('should include all read-only tools', async () => {
    const tools = await client.listTools();
    const toolNames = tools.map((t) => t.name);

    // Read-only tools
    expect(toolNames).toContain('list_all_tasks');
    expect(toolNames).toContain('search_tasks');
    expect(toolNames).toContain('get_task_history');
    expect(toolNames).toContain('get_task_categories');
    expect(toolNames).toContain('get_task_details');
    expect(toolNames).toContain('list_achievements');
    expect(toolNames).toContain('list_achievement_categories');
    expect(toolNames).toContain('match_task_to_achievements');
    expect(toolNames).toContain('list_skills');
    expect(toolNames).toContain('get_user_info');
    expect(toolNames).toContain('get_coin_balance');
    expect(toolNames).toContain('list_shop_items');
    expect(toolNames).toContain('get_shop_categories');
    expect(toolNames).toContain('search_shop_items');
  });

  it('should include all create tools', async () => {
    const tools = await client.listTools();
    const toolNames = tools.map((t) => t.name);

    expect(toolNames).toContain('create_task');
    expect(toolNames).toContain('create_achievement');
    expect(toolNames).toContain('add_shop_item');
  });

  it('should NOT include edit/delete tools', async () => {
    const tools = await client.listTools();
    const toolNames = tools.map((t) => t.name);

    // Edit/delete tools that should be blocked
    expect(toolNames).not.toContain('edit_task');
    expect(toolNames).not.toContain('delete_task');
    expect(toolNames).not.toContain('edit_subtask');
    expect(toolNames).not.toContain('update_achievement');
    expect(toolNames).not.toContain('delete_achievement');
    expect(toolNames).not.toContain('edit_shop_item');
    expect(toolNames).not.toContain('apply_penalty');
    expect(toolNames).not.toContain('edit_skill');
  });

  it('should allow create_task', async () => {
    const response = await client.callTool('create_task', {
      name: '[E2E-TEST] SAFE_MODE Task',
      exp: 50,
    });

    expectSuccess(response);

    // Extract ID for cleanup
    const taskId = parseInt(response.text.match(/ID[:\s]+(\d+)/i)?.[1] || '0', 10);
    if (taskId > 0) testData['track']('task', taskId);
  });

  it('should allow create_achievement', async () => {
    const response = await client.callTool('create_achievement', {
      name: '[E2E-TEST] SAFE_MODE Achievement',
      category_id: 1,
    });

    expectSuccess(response);

    const achievementId = parseInt(response.text.match(/ID[:\s]+(\d+)/i)?.[1] || '0', 10);
    if (achievementId > 0) testData['track']('achievement', achievementId);
  });

  it('should allow add_shop_item', async () => {
    const response = await client.callTool('add_shop_item', {
      name: '[E2E-TEST] SAFE_MODE Item',
      price: 100,
    });

    expectSuccess(response);

    const itemId = parseInt(response.text.match(/ID[:\s]+(\d+)/i)?.[1] || '0', 10);
    if (itemId > 0) testData['track']('item', itemId);
  });

  it('should block edit_task at runtime', async () => {
    const taskId = await testData.createTestTask({
      name: 'Block Edit Test',
    });

    const response = await client.callTool('edit_task', {
      id: taskId,
      todo: 'Should be blocked',
    });

    expectSafeModeBlocked(response);
  });

  it('should block delete_task at runtime', async () => {
    const taskId = await testData.createTestTask({
      name: 'Block Delete Test',
    });

    const response = await client.callTool('delete_task', {
      id: taskId,
    });

    expectSafeModeBlocked(response);
  });

  it('should block update_achievement at runtime', async () => {
    const achievementId = await testData.createTestAchievement({
      name: 'Block Update Test',
      category_id: 1,
    });

    const response = await client.callTool('update_achievement', {
      edit_id: achievementId,
      name: 'Should be blocked',
    });

    expectSafeModeBlocked(response);
  });

  it('should block delete_achievement at runtime', async () => {
    const achievementId = await testData.createTestAchievement({
      name: 'Block Delete Achievement Test',
      category_id: 1,
    });

    const response = await client.callTool('delete_achievement', {
      edit_id: achievementId,
    });

    expectSafeModeBlocked(response);
  });

  it('should block edit_shop_item at runtime', async () => {
    const itemId = await testData.createTestShopItem({
      name: 'Block Edit Item Test',
      price: 100,
    });

    const response = await client.callTool('edit_shop_item', {
      id: itemId,
      set_price: 150,
      set_price_type: 'absolute',
    });

    expectSafeModeBlocked(response);
  });

  it('should block apply_penalty at runtime', async () => {
    const response = await client.callTool('apply_penalty', {
      type: 'coin',
      content: 'Should be blocked',
      number: 10,
    });

    expectSafeModeBlocked(response);
  });

  it('should block edit_skill at runtime', async () => {
    const response = await client.callTool('edit_skill', {
      content: 'Should be blocked',
    });

    expectSafeModeBlocked(response);
  });
});

describe('SAFE_MODE=false (Permissive Mode)', () => {
  let client: MCPTestClient;
  let testData: TestDataManager;

  beforeAll(async () => {
    // Start server with SAFE_MODE=false (default)
    client = new MCPTestClient();
    await client.start({ SAFE_MODE: 'false' });
    testData = new TestDataManager(client);
  });

  afterAll(async () => {
    await testData.cleanup();
    await client.stop();
  });

  it('should list all 26 tools', async () => {
    const tools = await client.listTools();

    expect(tools.length).toBe(26);
  });

  it('should include edit/delete tools', async () => {
    const tools = await client.listTools();
    const toolNames = tools.map((t) => t.name);

    expect(toolNames).toContain('edit_task');
    expect(toolNames).toContain('delete_task');
    expect(toolNames).toContain('update_achievement');
    expect(toolNames).toContain('delete_achievement');
    expect(toolNames).toContain('edit_shop_item');
    expect(toolNames).toContain('apply_penalty');
    expect(toolNames).toContain('edit_skill');
  });

  it('should allow edit_task', async () => {
    const taskId = await testData.createTestTask({
      name: 'Edit Allowed Test',
      exp: 50,
      skillIds: [1],
    });

    const response = await client.callTool('edit_task', {
      id: taskId,
      todo: 'Updated in permissive mode',
    });

    expectSuccess(response);
  });

  it('should allow delete_task', async () => {
    const taskId = await testData.createTestTask({
      name: 'Delete Allowed Test',
    });

    const response = await client.callTool('delete_task', {
      id: taskId,
    });

    expectSuccess(response);
  });

  it('should allow update_achievement', async () => {
    const achievementId = await testData.createTestAchievement({
      name: 'Update Allowed Test',
      category_id: 1,
    });

    const response = await client.callTool('update_achievement', {
      edit_id: achievementId,
      name: 'Updated in permissive mode',
    });

    expectSuccess(response);
  });

  it('should allow delete_achievement', async () => {
    const achievementId = await testData.createTestAchievement({
      name: 'Delete Allowed Achievement Test',
      category_id: 1,
    });

    const response = await client.callTool('delete_achievement', {
      edit_id: achievementId,
    });

    expectSuccess(response);
  });

  it('should allow edit_shop_item', async () => {
    const itemId = await testData.createTestShopItem({
      name: 'Edit Allowed Item Test',
      price: 100,
    });

    const response = await client.callTool('edit_shop_item', {
      id: itemId,
      set_price: 150,
      set_price_type: 'absolute',
    });

    expectSuccess(response);
  });

  it('should allow apply_penalty', async () => {
    const response = await client.callTool('apply_penalty', {
      type: 'coin',
      content: 'Allowed in permissive mode',
      number: 10,
    });

    expectSuccess(response);
  });

  it('should allow edit_skill', async () => {
    const response = await client.callTool('edit_skill', {
      content: '[E2E-TEST] Skill in Permissive Mode',
      desc: 'Created in permissive mode',
    });

    expectSuccess(response);

    const skillId = parseInt(response.text.match(/ID[:\s]+(\d+)/i)?.[1] || '0', 10);
    if (skillId > 0) testData['track']('skill', skillId);
  });
});
