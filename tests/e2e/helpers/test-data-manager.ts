import { MCPTestClient, MCPToolResponse } from './mcp-client';

/**
 * Test Data Manager
 *
 * Manages the lifecycle of test data created during e2e tests.
 *
 * Key responsibilities:
 * - Add [E2E-TEST] prefix to all created data for easy identification
 * - Track created IDs for automatic cleanup
 * - Parse markdown responses to extract IDs
 * - Cleanup all created data in afterAll hooks
 * - Fallback cleanup by prefix scanning
 *
 * This prevents data corruption by ensuring all test data is properly
 * cleaned up and can be manually identified in the LifeUp app if needed.
 */
export class TestDataManager {
  private client: MCPTestClient;
  private createdIds: Map<string, number[]> = new Map();
  private readonly testPrefix = '[E2E-TEST]';

  constructor(client: MCPTestClient) {
    this.client = client;
  }

  /**
   * Create a test task with automatic cleanup tracking
   *
   * @param params Task creation parameters
   * @returns The created task ID for further reference
   * @throws Error if response doesn't contain a valid task ID
   */
  async createTestTask(params: {
    name: string;
    exp?: number;
    coin?: number;
    skillIds?: number[];
    frequency?: number;
    task_type?: number;
    target_times?: number;
    is_affect_shop_reward?: boolean;
    auto_use_item?: boolean;
    categoryId?: number;
    deadline?: string;
    subtasks?: Array<{ todo: string; exp?: number; coin?: number }>;
  }): Promise<number> {
    const testName = `${this.testPrefix} ${params.name}`;

    const response = await this.client.callTool('create_task', {
      ...params,
      name: testName,
    });

    if (response.isError) {
      throw new Error(`Failed to create test task: ${response.text}`);
    }

    const taskId = this.extractTaskId(response.text);
    this.track('task', taskId);

    return taskId;
  }

  /**
   * Create a test achievement with automatic cleanup tracking
   *
   * @param params Achievement creation parameters
   * @returns The created achievement ID
   * @throws Error if response doesn't contain a valid achievement ID
   */
  async createTestAchievement(params: {
    name: string;
    category_id: number;
    desc?: string;
    exp?: number;
    coin?: number;
    skills?: number[];
    conditions_json?: unknown;
  }): Promise<number> {
    const testName = `${this.testPrefix} ${params.name}`;

    const response = await this.client.callTool('create_achievement', {
      ...params,
      name: testName,
    });

    if (response.isError) {
      throw new Error(`Failed to create test achievement: ${response.text}`);
    }

    const achievementId = this.extractAchievementId(response.text);
    this.track('achievement', achievementId);

    return achievementId;
  }

  /**
   * Create a test shop item with automatic cleanup tracking
   *
   * @param params Shop item creation parameters
   * @returns The created item ID
   * @throws Error if response doesn't contain a valid item ID
   */
  async createTestShopItem(params: {
    name: string;
    price: number;
    desc?: string;
    stock_number?: number;
    category?: number;
    effects?: unknown[];
  }): Promise<number> {
    const testName = `${this.testPrefix} ${params.name}`;

    const response = await this.client.callTool('add_shop_item', {
      ...params,
      name: testName,
    });

    if (response.isError) {
      throw new Error(`Failed to create test shop item: ${response.text}`);
    }

    const itemId = this.extractItemId(response.text);
    this.track('item', itemId);

    return itemId;
  }

  /**
   * Create a test skill with automatic cleanup tracking
   *
   * @param params Skill creation parameters
   * @returns The created skill ID
   * @throws Error if response doesn't contain a valid skill ID
   */
  async createTestSkill(params: {
    content: string;
    desc?: string;
    icon?: string;
  }): Promise<number> {
    const testContent = `${this.testPrefix} ${params.content}`;

    const response = await this.client.callTool('edit_skill', {
      ...params,
      content: testContent,
    });

    if (response.isError) {
      throw new Error(`Failed to create test skill: ${response.text}`);
    }

    const skillId = this.extractSkillId(response.text);
    this.track('skill', skillId);

    return skillId;
  }

  /**
   * Cleanup all created test data using tracked IDs
   *
   * Attempts to delete all tracked resources. Failures are logged as warnings
   * and don't break the test run. This allows tests to complete even if
   * cleanup partially fails.
   */
  async cleanup(): Promise<void> {
    const errors: string[] = [];

    // Delete tasks
    for (const taskId of this.getTracked('task')) {
      try {
        await this.client.callTool('delete_task', { id: taskId });
      } catch (error) {
        const msg = `Failed to delete test task ${taskId}: ${error instanceof Error ? error.message : String(error)}`;
        console.warn(`[TestDataManager] ${msg}`);
        errors.push(msg);
      }
    }

    // Delete achievements
    for (const achievementId of this.getTracked('achievement')) {
      try {
        await this.client.callTool('delete_achievement', { edit_id: achievementId });
      } catch (error) {
        const msg = `Failed to delete test achievement ${achievementId}: ${error instanceof Error ? error.message : String(error)}`;
        console.warn(`[TestDataManager] ${msg}`);
        errors.push(msg);
      }
    }

    // Delete skills
    for (const skillId of this.getTracked('skill')) {
      try {
        await this.client.callTool('edit_skill', {
          skill_id: skillId,
          is_delete: true,
        });
      } catch (error) {
        const msg = `Failed to delete test skill ${skillId}: ${error instanceof Error ? error.message : String(error)}`;
        console.warn(`[TestDataManager] ${msg}`);
        errors.push(msg);
      }
    }

    // Shop items: Note - LifeUp API may not support deletion, so skip for now
    // Items can be cleaned up manually or by setting stock to 0

    this.createdIds.clear();

    if (errors.length > 0) {
      console.warn(
        `[TestDataManager] Cleanup completed with ${errors.length} error(s). Check logs above for details.`
      );
    }
  }

  /**
   * Find and delete all test data by prefix (fallback cleanup)
   *
   * This is a fallback mechanism if automatic cleanup by ID fails.
   * It scans all resources and deletes those matching the [E2E-TEST] prefix.
   *
   * Should only be used in exceptional circumstances (e.g., during test suite cleanup).
   */
  async cleanupByPrefix(): Promise<void> {
    try {
      // Find and delete tasks with [E2E-TEST] prefix
      const tasksResponse = await this.client.callTool('list_all_tasks', {});
      if (!tasksResponse.isError) {
        const testTaskIds = this.parseTasksWithPrefix(tasksResponse.text);
        for (const taskId of testTaskIds) {
          try {
            await this.client.callTool('delete_task', { id: taskId });
          } catch (error) {
            console.warn(`Failed to cleanup task ${taskId} by prefix:`, error);
          }
        }
      }

      // Find and delete achievements with [E2E-TEST] prefix
      const achievementsResponse = await this.client.callTool('list_achievements', {});
      if (!achievementsResponse.isError) {
        const testAchievementIds = this.parseAchievementsWithPrefix(achievementsResponse.text);
        for (const achievementId of testAchievementIds) {
          try {
            await this.client.callTool('delete_achievement', { edit_id: achievementId });
          } catch (error) {
            console.warn(`Failed to cleanup achievement ${achievementId} by prefix:`, error);
          }
        }
      }
    } catch (error) {
      console.warn('[TestDataManager] Prefix-based cleanup failed:', error);
    }
  }

  /**
   * Extract task ID from MCP response markdown
   *
   * @private
   * @throws Error if task ID cannot be extracted
   */
  private extractTaskId(markdownText: string): number {
    // Look for patterns like "**ID**: 123" or "ID: 123"
    let match = markdownText.match(/\*\*ID\*\*:\s*(\d+)/i);
    if (!match || !match[1]) {
      match = markdownText.match(/(?:Task created.*?)?ID[:\s]+(\d+)/i);
    }
    if (!match || !match[1]) {
      throw new Error(`Could not extract task ID from response: ${markdownText}`);
    }
    return parseInt(match[1], 10);
  }

  /**
   * Extract achievement ID from MCP response markdown
   *
   * @private
   * @throws Error if achievement ID cannot be extracted
   */
  private extractAchievementId(markdownText: string): number {
    // Look for patterns like "**Achievement ID**: 123" or "ID: 123"
    let match = markdownText.match(/\*\*Achievement ID\*\*:\s*(\d+)/i);
    if (!match || !match[1]) {
      match = markdownText.match(/(?:Achievement created.*?)?ID[:\s]+(\d+)/i);
    }
    if (!match || !match[1]) {
      throw new Error(`Could not extract achievement ID from response: ${markdownText}`);
    }
    return parseInt(match[1], 10);
  }

  /**
   * Extract item ID from MCP response markdown
   *
   * @private
   * @throws Error if item ID cannot be extracted
   */
  private extractItemId(markdownText: string): number {
    // Look for patterns like "**Item ID**: 123" or "ID: 123"
    let match = markdownText.match(/\*\*Item ID\*\*:\s*(\d+)/i);
    if (!match || !match[1]) {
      match = markdownText.match(/(?:Item created.*?)?ID[:\s]+(\d+)/i);
    }
    if (!match || !match[1]) {
      throw new Error(`Could not extract item ID from response: ${markdownText}`);
    }
    return parseInt(match[1], 10);
  }

  /**
   * Extract skill ID from MCP response markdown
   *
   * @private
   * @throws Error if skill ID cannot be extracted
   */
  private extractSkillId(markdownText: string): number {
    const match = markdownText.match(/(?:Skill created.*?)?ID[:\s]+(\d+)/i);
    if (!match || !match[1]) {
      throw new Error(`Could not extract skill ID from response: ${markdownText}`);
    }
    return parseInt(match[1], 10);
  }

  /**
   * Parse task IDs from markdown response that have [E2E-TEST] prefix
   *
   * @private
   */
  private parseTasksWithPrefix(markdownText: string): number[] {
    const lines = markdownText.split('\n');
    const taskIds: number[] = [];

    for (const line of lines) {
      if (line.includes(this.testPrefix)) {
        // Try to extract ID from the line
        // Format may vary, but usually contains the ID somewhere
        const idMatch = line.match(/\b(\d+)\b/);
        if (idMatch) {
          taskIds.push(parseInt(idMatch[1], 10));
        }
      }
    }

    return taskIds;
  }

  /**
   * Parse achievement IDs from markdown response that have [E2E-TEST] prefix
   *
   * @private
   */
  private parseAchievementsWithPrefix(markdownText: string): number[] {
    const lines = markdownText.split('\n');
    const achievementIds: number[] = [];

    for (const line of lines) {
      if (line.includes(this.testPrefix)) {
        const idMatch = line.match(/\b(\d+)\b/);
        if (idMatch) {
          achievementIds.push(parseInt(idMatch[1], 10));
        }
      }
    }

    return achievementIds;
  }

  /**
   * Track a created resource ID for later cleanup
   *
   * @private
   */
  private track(type: string, id: number): void {
    if (!this.createdIds.has(type)) {
      this.createdIds.set(type, []);
    }
    this.createdIds.get(type)!.push(id);
  }

  /**
   * Get all tracked IDs for a resource type
   *
   * @private
   */
  private getTracked(type: string): number[] {
    return this.createdIds.get(type) || [];
  }
}
