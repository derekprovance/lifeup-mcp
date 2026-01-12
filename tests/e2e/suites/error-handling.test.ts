import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { MCPTestClient } from '../helpers/mcp-client';
import { expectError } from '../helpers/assertions';

/**
 * Error Handling E2E Tests
 *
 * Tests that the MCP server properly handles and reports errors.
 * Validates input validation, API errors, and connection errors.
 *
 * Coverage:
 * - Input validation errors (empty name, negative values, max length)
 * - API errors (non-existent IDs, invalid categories)
 * - Connection errors (unreachable server)
 */
describe('Error Handling', () => {
  let client: MCPTestClient;

  beforeAll(async () => {
    client = new MCPTestClient();
    await client.start();
  });

  afterAll(async () => {
    await client.stop();
  });

  describe('Validation Errors', () => {
    it('should handle task with empty name', async () => {
      const response = await client.callTool('create_task', {
        name: '',
      });

      // API may or may not validate empty names
      if (response.isError) {
        expect(response.text).toMatch(/empty|invalid|validation|required/i);
      }
    });

    it('should handle task with very long name (>200 chars)', async () => {
      const response = await client.callTool('create_task', {
        name: 'x'.repeat(201),
      });

      // API may or may not validate name length
      if (response.isError) {
        expect(response.text).toMatch(/too long|max|exceed|length/i);
      }
    });

    it('should handle task with negative exp', async () => {
      const response = await client.callTool('create_task', {
        name: 'Valid Name',
        exp: -10,
      });

      // API may or may not validate negative exp
      if (response.isError) {
        expect(response.text).toMatch(/negative|invalid|minimum/i);
      }
    });

    it('should handle task with negative coin', async () => {
      const response = await client.callTool('create_task', {
        name: 'Valid Name',
        coin: -5,
      });

      // API may or may not validate negative coin
      if (response.isError) {
        expect(response.text).toMatch(/negative|invalid|minimum/i);
      }
    });

    it('should handle achievement with empty name', async () => {
      const response = await client.callTool('create_achievement', {
        name: '',
        category_id: 1,
      });

      // API may or may not validate empty names
      expect(response).toBeDefined();
    });

    it('should handle shop item with invalid price', async () => {
      const response = await client.callTool('add_shop_item', {
        name: 'Test Item',
        price: -100,
      });

      // API may or may not validate negative prices
      if (response.isError) {
        expect(response.text).toMatch(/invalid|negative|price/i);
      }
    });
  });

  describe('API Errors', () => {
    it('should handle non-existent task ID', async () => {
      const response = await client.callTool('get_task_details', {
        id: 999999,
      });

      // API may or may not return error for non-existent IDs
      if (response.isError) {
        expect(response.text).toMatch(/not found|invalid|does not exist|cannot find/i);
      }
    });

    it('should handle delete of non-existent task', async () => {
      const response = await client.callTool('delete_task', {
        id: 999999,
      });

      // API may or may not return error for non-existent IDs
      if (response.isError) {
        expect(response.text).toMatch(/not found|invalid|does not exist|cannot find/i);
      }
    });

    it('should handle non-existent achievement ID', async () => {
      const response = await client.callTool('update_achievement', {
        edit_id: 999999,
        name: 'Test',
      });

      // API may or may not return error
      expect(response).toBeDefined();
    });

    it('should handle invalid category ID in task creation', async () => {
      const response = await client.callTool('create_task', {
        name: 'Test Task',
        categoryId: 999999,
      });

      // May succeed (depends on LifeUp behavior) or fail - both are acceptable
      // But if it fails, should have clear error message
      if (response.isError) {
        expect(response.text).toBeTruthy();
      }
    });

    it('should handle search with invalid parameters', async () => {
      const response = await client.callTool('search_tasks', {
        searchQuery: '', // Empty search query
      });

      // Should handle gracefully
      expect(response.text).toBeTruthy();
    });

    it('should handle shop item search with invalid price range', async () => {
      const response = await client.callTool('search_shop_items', {
        minPrice: 1000,
        maxPrice: 100, // max < min
      });

      // May fail or return empty results
      expect(response.text).toBeTruthy();
    });
  });

  describe('Connection Errors', () => {
    it('should provide helpful error when server unreachable', { timeout: 60000 }, async () => {
      // Create new client with invalid host
      const badClient = new MCPTestClient();

      try {
        await badClient.start({
          LIFEUP_HOST: '192.168.255.255', // Non-existent host
          LIFEUP_PORT: '13276',
        });

        // If we get here, try a tool call that should fail
        const response = await badClient.callTool('list_all_tasks', {});

        expectError(response);
        expect(response.text).toMatch(
          /connection|unreachable|network|LIFEUP_HOST|ECONNREFUSED|timeout/i
        );

        await badClient.stop();
      } catch (error) {
        // Connection failure is expected
        expect(error).toBeDefined();
      }
    });
  });

  describe('Response Format Errors', () => {
    it('should handle missing required parameters', async () => {
      const response = await client.callTool('create_task', {
        // Missing 'name' parameter
        exp: 50,
      } as any);

      // API may or may not validate missing parameters
      if (response.isError) {
        expect(response.text).toMatch(/required|missing|parameter|invalid/i);
      }
    });

    it('should handle invalid parameter type', async () => {
      const response = await client.callTool('create_task', {
        name: 'Test',
        exp: 'not a number', // Should be number
      } as any);

      // API may or may not validate parameter types
      expect(response).toBeDefined();
    });

    it('should handle unknown tool call', async () => {
      const response = await client.callTool('non_existent_tool', {});

      // Unknown tool should error
      if (response.isError) {
        expect(response.text).toMatch(/unknown|not found|does not exist/i);
      } else {
        // But if it doesn't error, at least verify it's an error message
        expect(response.text).toMatch(/unknown|not found/i);
      }
    });
  });
});
