/**
 * MCP Server implementation for LifeUp Cloud API
 */

import {
  Server,
} from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { lifeupClient } from './client/lifeup-client.js';
import { TaskTools } from './tools/task-tools.js';
import { AchievementTools } from './tools/achievement-tools.js';
import { UserInfoTools } from './tools/user-info-tools.js';
import { ShopTools } from './tools/shop-tools.js';
import { configManager } from './config/config.js';

class LifeUpServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'lifeup-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandlers();
  }

  private setupToolHandlers(): void {
    // Create Zod schemas for request validation
    const ListToolsSchema = z.object({
      method: z.literal('tools/list'),
    });

    // Register tools/list handler
    (this.server.setRequestHandler as any)(
      ListToolsSchema,
      async () => {
        return {
          tools: this.getTools(),
        };
      }
    );

    // Register tools/call handler
    (this.server.setRequestHandler as any)(
      CallToolRequestSchema,
      async (request: any) => {
        configManager.logIfDebug(`Tool called: ${request.params.name}`, request.params.arguments);

        try {
          let result: string;

          switch (request.params.name) {
            case 'check_lifeup_connection': {
              const isHealthy = await lifeupClient.healthCheck();
              const config = configManager.getConfig();

              if (isHealthy) {
                result = `✓ Successfully connected to LifeUp at ${config.baseUrl}`;
              } else {
                result =
                  `❌ Cannot reach LifeUp device at ${config.baseUrl}\n\n` +
                  `Troubleshooting steps:\n` +
                  `1. Make sure LifeUp app is running on the device\n` +
                  `2. Verify the device is connected to the same network\n` +
                  `3. Check that the IP address is correct (currently: ${config.host})\n` +
                  `4. Ensure LifeUp HTTP API is enabled in settings\n\n` +
                  `Once the device is reachable, try your request again.`;
              }
              break;
            }

            case 'create_task':
              result = await TaskTools.createTask(request.params.arguments);
              break;

            case 'list_all_tasks':
              result = await TaskTools.listAllTasks();
              break;

            case 'search_tasks':
              result = await TaskTools.searchTasks(request.params.arguments);
              break;

            case 'get_task_history':
              result = await TaskTools.getTaskHistory(request.params.arguments);
              break;

            case 'get_task_categories':
              result = await TaskTools.getTaskCategories();
              break;

            case 'list_achievements':
              result = await AchievementTools.listAchievements();
              break;

            case 'match_task_to_achievements':
              result = await AchievementTools.matchTaskToAchievements(request.params.arguments);
              break;

            case 'list_skills':
              result = await UserInfoTools.listSkills();
              break;

            case 'get_user_info':
              result = await UserInfoTools.getUserInfo();
              break;

            case 'get_coin_balance':
              result = await UserInfoTools.getCoinBalance();
              break;

            case 'list_shop_items':
              result = await ShopTools.listShopItems();
              break;

            case 'get_shop_categories':
              result = await ShopTools.getShopCategories();
              break;

            case 'search_shop_items':
              result = await ShopTools.searchShopItems(request.params.arguments);
              break;

            case 'create_achievement':
              result = await AchievementTools.createAchievement(request.params.arguments);
              break;

            case 'update_achievement':
              result = await AchievementTools.updateAchievement(request.params.arguments);
              break;

            case 'delete_achievement':
              result = await AchievementTools.deleteAchievement(request.params.arguments);
              break;

            default:
              return {
                content: [
                  {
                    type: 'text',
                    text: `Unknown tool: ${request.params.name}`,
                  },
                ],
                isError: true,
              };
          }

          return {
            content: [
              {
                type: 'text',
                text: result,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error executing tool: ${(error as Error).message}`,
              },
            ],
            isError: true,
          };
        }
      }
    );
  }

  private setupErrorHandlers(): void {
    // Error handlers are optional for this implementation
  }

  private getTools(): any[] {
    return [
      {
        name: 'check_lifeup_connection',
        description:
          'Check if the LifeUp device is reachable. Use this to verify connectivity or troubleshoot connection issues. ' +
          'Returns connection status and helpful information if the device cannot be reached.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_task',
        description:
          'Create a new task in LifeUp. Specify task name and optional rewards (experience points and coins). ' +
          'The task will be created as an active task in your LifeUp app. ' +
          'This tool will prompt you to confirm the server is running if it cannot connect.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Task name (required, max 200 characters)',
            },
            exp: {
              type: 'number',
              description: 'Experience points reward (optional, non-negative)',
            },
            coin: {
              type: 'number',
              description: 'Coin reward (optional, non-negative)',
            },
            categoryId: {
              type: 'number',
              description: 'Category/list ID to place the task in (optional)',
            },
            deadline: {
              type: 'number',
              description: 'Deadline as timestamp in milliseconds (optional)',
            },
            skillIds: {
              type: 'array',
              items: {
                type: 'number',
              },
              description: 'Associated skill IDs (optional)',
            },
            content: {
              type: 'string',
              description: 'Task description/content (optional, max 1000 characters)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_all_tasks',
        description:
          'List all tasks from your LifeUp app. Returns active and completed tasks, showing task names, ' +
          'descriptions, and rewards. Useful for reviewing your current workload or understanding task patterns.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'search_tasks',
        description:
          'Search and filter tasks by criteria such as name, status (active/completed), category, or deadline. ' +
          'Useful for finding specific tasks or analyzing tasks by various dimensions.',
        inputSchema: {
          type: 'object',
          properties: {
            searchQuery: {
              type: 'string',
              description: 'Search for tasks containing this text in name or content (optional)',
            },
            categoryId: {
              type: 'number',
              description: 'Filter by category/list ID (optional)',
            },
            status: {
              type: 'string',
              enum: ['active', 'completed', 'all'],
              description: 'Filter by task status (optional, default: all)',
            },
            deadlineBefore: {
              type: 'number',
              description: 'Filter for tasks with deadline before this timestamp (optional)',
            },
          },
        },
      },
      {
        name: 'get_task_history',
        description:
          'Retrieve your task completion history. Shows recently completed tasks with timestamps and rewards earned. ' +
          'Helpful for understanding your productivity patterns and accomplishments.',
        inputSchema: {
          type: 'object',
          properties: {
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum records to return (default: 100, max: 1000)',
            },
          },
        },
      },
      {
        name: 'get_task_categories',
        description: 'List all task categories/lists available in your LifeUp app.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_achievements',
        description:
          'List all available achievements in your LifeUp app. Shows both unlocked and locked achievements ' +
          'with their descriptions and progress. If full achievement data is unavailable in your LifeUp version, ' +
          'shows achievement categories instead.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'match_task_to_achievements',
        description:
          'Match a task to potentially relevant achievements based on task name and keywords. ' +
          'Helps identify which achievements could be earned by completing specific tasks. ' +
          'Uses keyword matching and category cross-reference. Returns top 5 matches with confidence scores.',
        inputSchema: {
          type: 'object',
          properties: {
            taskName: {
              type: 'string',
              description: 'Name of the task to match (required)',
            },
            categoryId: {
              type: 'number',
              description: 'Optional category ID for more precise matching',
            },
          },
          required: ['taskName'],
        },
      },
      {
        name: 'list_skills',
        description:
          'List all character skills with their current levels, experience points, and progress toward the next level. ' +
          'Useful for understanding your character progression and which skills to focus on.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_user_info',
        description:
          'Get user profile information including player name, character level, total experience, and app version. ' +
          'Useful for understanding the current state of your LifeUp account.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_coin_balance',
        description:
          'Get your current coin balance and currency information. Coins are the in-game currency used to purchase items from the shop. ' +
          'Useful for planning purchases and understanding your economy.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_shop_items',
        description:
          'List all items available in the shop with prices, stock availability, and your owned quantity. ' +
          'Shows both in-stock and out-of-stock items. Useful for browsing available rewards and planning future purchases.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_shop_categories',
        description:
          'List all shop item categories. Categories help organize items in the shop and make browsing easier.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'search_shop_items',
        description:
          'Search and filter shop items by criteria such as name, category, or price range. ' +
          'Useful for finding specific items or comparing prices across different categories.',
        inputSchema: {
          type: 'object',
          properties: {
            searchQuery: {
              type: 'string',
              description: 'Search for items containing this text in name or description (optional)',
            },
            categoryId: {
              type: 'number',
              description: 'Filter by category ID (optional)',
            },
            minPrice: {
              type: 'number',
              description: 'Filter for items with price at least this value (optional)',
            },
            maxPrice: {
              type: 'number',
              description: 'Filter for items with price at most this value (optional)',
            },
          },
        },
      },
      {
        name: 'create_achievement',
        description:
          'Create a new custom achievement with unlock conditions and rewards. ' +
          'Requires achievement name and category ID. Optionally specify unlock conditions (JSON array), ' +
          'experience/coin rewards, skill rewards, item rewards, and appearance settings. ' +
          'Created achievements are locked by default.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Achievement name (required, max 100 characters)',
            },
            category_id: {
              type: 'number',
              description: 'Achievement category/list ID (required)',
            },
            desc: {
              type: 'string',
              description: 'Achievement description (optional, max 500 characters)',
            },
            conditions_json: {
              type: 'array',
              description: 'Unlock conditions as JSON array (optional). Format: [{"type":7,"target":1000000}]. ' +
                'Common types: 0=task completion, 3=pomodoro, 6=daily streak, 7=coins, 13=skill level, 14=life level',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'number' },
                  related_id: { type: 'number' },
                  target: { type: 'number' },
                },
                required: ['type', 'target'],
              },
            },
            exp: {
              type: 'number',
              description: 'Experience points reward (optional)',
            },
            coin: {
              type: 'number',
              description: 'Coin reward (optional, 0-999999)',
            },
            coin_var: {
              type: 'number',
              description: 'Coin reward variation/randomness (optional)',
            },
            skills: {
              type: 'array',
              items: { type: 'number' },
              description: 'Skill IDs to reward (optional)',
            },
            items: {
              type: 'array',
              description: 'Item rewards (optional). Format: [{"item_id":1,"amount":2}]',
              items: {
                type: 'object',
                properties: {
                  item_id: { type: 'number' },
                  amount: { type: 'number' },
                },
                required: ['item_id', 'amount'],
              },
            },
            item_id: {
              type: 'number',
              description: 'Single item reward ID (optional, alternative to items array)',
            },
            item_amount: {
              type: 'number',
              description: 'Single item reward amount (optional, 1-99)',
            },
            secret: {
              type: 'boolean',
              description: 'Hidden achievement (optional, default: false)',
            },
            color: {
              type: 'string',
              description: 'Title color in hex format (optional, e.g., "#66CCFF")',
            },
            unlocked: {
              type: 'boolean',
              description: 'Create as already unlocked (optional, default: false)',
            },
          },
          required: ['name', 'category_id'],
        },
      },
      {
        name: 'update_achievement',
        description:
          'Update an existing achievement by ID. Can modify any property including name, conditions, rewards, and unlock status. ' +
          'Use absolute or relative set types for numeric rewards.',
        inputSchema: {
          type: 'object',
          properties: {
            edit_id: {
              type: 'number',
              description: 'Achievement ID to update (required)',
            },
            name: {
              type: 'string',
              description: 'New achievement name (optional)',
            },
            category_id: {
              type: 'number',
              description: 'New category ID (optional)',
            },
            desc: {
              type: 'string',
              description: 'New description (optional)',
            },
            conditions_json: {
              type: 'array',
              description: 'New unlock conditions (optional). Replaces existing conditions.',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'number' },
                  related_id: { type: 'number' },
                  target: { type: 'number' },
                },
                required: ['type', 'target'],
              },
            },
            exp: {
              type: 'number',
              description: 'Experience reward (optional)',
            },
            coin: {
              type: 'number',
              description: 'Coin reward (optional)',
            },
            coin_set_type: {
              type: 'string',
              enum: ['absolute', 'relative'],
              description: 'How to set coin value: absolute (replace) or relative (add/subtract)',
            },
            exp_set_type: {
              type: 'string',
              enum: ['absolute', 'relative'],
              description: 'How to set exp value: absolute (replace) or relative (add/subtract)',
            },
            skills: {
              type: 'array',
              items: { type: 'number' },
              description: 'New skill rewards (optional, replaces existing)',
            },
            items: {
              type: 'array',
              description: 'New item rewards (optional, replaces existing)',
              items: {
                type: 'object',
                properties: {
                  item_id: { type: 'number' },
                  amount: { type: 'number' },
                },
                required: ['item_id', 'amount'],
              },
            },
            secret: {
              type: 'boolean',
              description: 'Update hidden status (optional)',
            },
            color: {
              type: 'string',
              description: 'New title color (optional, hex format)',
            },
            unlocked: {
              type: 'boolean',
              description: 'Update unlock status (optional)',
            },
          },
          required: ['edit_id'],
        },
      },
      {
        name: 'delete_achievement',
        description:
          'Delete an achievement by ID. This action is permanent and cannot be undone. ' +
          'Use with caution.',
        inputSchema: {
          type: 'object',
          properties: {
            edit_id: {
              type: 'number',
              description: 'Achievement ID to delete (required)',
            },
          },
          required: ['edit_id'],
        },
      },
    ];
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    const config = configManager.getConfig();

    // Log initialization
    configManager.logIfDebug('LifeUp MCP Server starting...');
    configManager.logIfDebug('Configuration:', {
      baseUrl: config.baseUrl,
      hasApiToken: !!configManager.getApiToken(),
    });

    // Check server health on startup (informational only, don't block startup)
    const maxRetries = 3;
    const retryDelayMs = 1000;
    let isHealthy = false;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      configManager.logIfDebug(`Health check attempt ${attempt}/${maxRetries}...`);
      isHealthy = await lifeupClient.healthCheck();

      if (isHealthy) {
        configManager.logIfDebug('Health check passed! LifeUp server is reachable.');
        break;
      }

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }

    if (!isHealthy) {
      configManager.logIfDebug(
        `Warning: LifeUp server unreachable at startup (${config.baseUrl}). ` +
        'Tools will report connection errors until the device is reachable.'
      );
      // Don't block startup - let Claude know about connection issues through tool responses
    } else {
      configManager.logIfDebug('LifeUp server is reachable and ready.');
    }

    try {
      configManager.logIfDebug('Connecting to stdio transport...');
      await this.server.connect(transport);
      configManager.logIfDebug('LifeUp MCP Server connected via stdio transport');

      // Keep the server running - connect() should block until disconnected
      // But add a message to confirm we're running
      configManager.logIfDebug('LifeUp MCP Server is now ready to handle requests');
    } catch (error) {
      console.error('Error during server connection:', error);
      throw error;
    }
  }
}

// Global error handlers to prevent unhandled rejections from crashing
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit, just log the error
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit, just log the error
});

// Main entry point
const server = new LifeUpServer();
server.start().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
