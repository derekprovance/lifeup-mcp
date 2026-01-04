/**
 * MCP Server implementation for LifeUp Cloud API
 */

import {
  Server,
} from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { lifeupClient } from './client/lifeup-client.js';
import { TaskTools } from './tools/task-tools.js';
import { AchievementTools } from './tools/achievement-tools.js';
import { UserInfoTools } from './tools/user-info-tools.js';
import { ShopTools } from './tools/shop-tools.js';
import { MutationTools } from './tools/mutation-tools.js';
import { configManager } from './config/config.js';

// Tools that create new entities - allowed in SAFE_MODE
const CREATE_TOOLS = [
  'create_task',
  'create_achievement',
  'add_shop_item',
] as const;

// Tools that modify or delete existing entities - blocked in SAFE_MODE
const EDIT_DELETE_TOOLS = [
  'edit_task',
  'update_achievement',
  'delete_achievement',
  'edit_shop_item',
  'apply_penalty',
  'edit_skill',
] as const;

// All mutation tools (for backward compatibility)
const MUTATION_TOOLS = [...CREATE_TOOLS, ...EDIT_DELETE_TOOLS] as const;

type EditDeleteTool = typeof EDIT_DELETE_TOOLS[number];

// Type guard to safely check if a tool name is an edit/delete tool
function isEditDeleteTool(toolName: string): toolName is EditDeleteTool {
  return (EDIT_DELETE_TOOLS as readonly string[]).includes(toolName);
}

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
    // The MCP SDK's setRequestHandler has complex generic types that TypeScript struggles with
    // We use a cast to Function to bypass type checking while maintaining runtime safety
    (this.server.setRequestHandler as unknown as Function)(
      ListToolsSchema,
      async () => {
        return {
          tools: this.getTools(),
        };
      }
    );

    // Register tools/call handler
    (this.server.setRequestHandler as unknown as Function)(
      CallToolRequestSchema,
      async (request: CallToolRequest) => {
        configManager.logIfDebug(`Tool called: ${request.params.name}`, request.params.arguments);

        // Runtime enforcement: block edit/delete tools in SAFE_MODE
        if (configManager.isSafeMode() && isEditDeleteTool(request.params.name)) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Operation blocked: "${request.params.name}" is disabled in SAFE_MODE.\n\n` +
                      `This tool modifies or deletes existing data. SAFE_MODE allows read operations and creating new entities ` +
                      `(create_task, create_achievement, add_shop_item), but blocks modifications and deletions.\n\n` +
                      `To use this tool, set SAFE_MODE=false in your .env file and restart the server.`,
              },
            ],
            isError: true,
          };
        }

        try {
          let result: string;

          switch (request.params.name) {
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

            case 'list_achievement_categories':
              result = await AchievementTools.listAchievementCategories();
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

            case 'edit_task':
              result = await MutationTools.editTask(request.params.arguments);
              break;

            case 'add_shop_item':
              result = await MutationTools.addShopItem(request.params.arguments);
              break;

            case 'edit_shop_item':
              result = await MutationTools.editShopItem(request.params.arguments);
              break;

            case 'apply_penalty':
              result = await MutationTools.applyPenalty(request.params.arguments);
              break;

            case 'edit_skill':
              result = await MutationTools.editSkill(request.params.arguments);
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
    const allTools = [
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
              description: 'Experience points reward (optional, non-negative). If specified, must provide skillIds to indicate which attributes receive the XP. If omitted, XP remains unchanged from the task\'s current value.',
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
              description: 'Skill/attribute IDs to receive XP rewards. Required when setting exp parameter. Supports multiple values (e.g., [1, 2, 3]). Without skillIds, XP cannot be applied to any attributes.',
            },
            content: {
              type: 'string',
              description: 'Task description/content (optional, max 1000 characters)',
            },
            auto_use_item: {
              type: 'boolean',
              description: 'Automatically use/consume item rewards when task is completed (optional, defaults to false)',
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
        name: 'match_task_to_achievements', //TODO - Test that this skill works properly
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
        name: 'list_achievement_categories',
        description:
          'List all achievement categories. Categories help organize achievements and are needed when creating new achievements. ' +
          'Shows category names, IDs, and descriptions.',
        inputSchema: {
          type: 'object',
          properties: {},
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
              description: 'Experience points reward (optional). IMPORTANT: Must specify skills array to apply XP to attributes.',
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
              description: 'Skill/attribute IDs to receive XP rewards. Required when setting exp parameter. Without skills, XP cannot be applied.',
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
          'Update an existing achievement by ID. Modify name, description, rewards, and unlock status. ' +
          '⚠️  IMPORTANT: Updating conditions_json is NOT supported by the LifeUp API. If you need to change conditions, delete this achievement and create a new one with desired conditions. ' +
          'Set numeric rewards using absolute (replace) or relative (add to current) set types. Always verify changes in the LifeUp app after updating.',
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
              description: 'Experience reward (optional). IMPORTANT: Must specify skills array to apply XP to attributes.',
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
              description: 'Skill/attribute IDs to receive XP rewards. Required when setting exp parameter (replaces existing). Without skills, XP cannot be applied.',
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
      {
        name: 'edit_task',
        description:
          'Edit properties of an existing task. Requires at least one identifier (id, gid, or name). ' +
          'Can modify task content, rewards, deadline, category, appearance, and more. ' +
          'Use exp_set_type and coin_set_type for absolute/relative value adjustments.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Task ID (one of id/gid/name required)',
            },
            gid: {
              type: 'number',
              description: 'Task group ID (one of id/gid/name required)',
            },
            name: {
              type: 'string',
              description: 'Task name for fuzzy search (one of id/gid/name required)',
            },
            todo: {
              type: 'string',
              description: 'New task content/description',
            },
            notes: {
              type: 'string',
              description: 'New task notes',
            },
            coin: {
              type: 'number',
              description: 'Coin reward upon completion. Use coin_set_type to control whether value is absolute or relative.',
            },
            coin_var: {
              type: 'number',
              description: 'Coin variance for random rewards',
            },
            coin_set_type: {
              type: 'string',
              enum: ['absolute', 'relative'],
              description: 'How to set coin value: absolute (replace current value) or relative (add/subtract from current value). ' +
                           'Default is absolute.',
            },
            exp: {
              type: 'number',
              description: 'Experience points reward (must be >= 0). Use exp_set_type to control whether value is absolute (replace) or relative (add/subtract). Required skillIds when setting this parameter.',
            },
            exp_set_type: {
              type: 'string',
              enum: ['absolute', 'relative'],
              description: 'How to set exp value: absolute (replace current value) or relative (add/subtract from current value). ' +
                           'Default is absolute.',
            },
            skills: {
              type: 'array',
              items: { type: 'number' },
              description: 'Skill/attribute IDs to receive XP rewards. Required when setting exp parameter. Supports multiple values (e.g., [1, 2, 3]). Without skills, XP cannot be applied.',
            },
            category: {
              type: 'number',
              description: 'List/category ID (0 for default)',
            },
            frequency: {
              type: 'number',
              description: 'Repeat frequency (-1=unlimited, -3=Ebbinghaus, -4=monthly, -5=yearly)',
            },
            importance: {
              type: 'number',
              description: 'Importance level (1-4)',
            },
            difficulty: {
              type: 'number',
              description: 'Difficulty level (1-4)',
            },
            deadline: {
              type: 'number',
              description: 'Due date as timestamp in milliseconds',
            },
            color: {
              type: 'string',
              description: 'Tag color in hex format (e.g., "#FF6B6B")',
            },
            items: {
              type: 'array',
              description: 'Item rewards. Format: [{"item_id":1,"amount":2}]',
              items: {
                type: 'object',
                properties: {
                  item_id: { type: 'number' },
                  amount: { type: 'number' },
                },
              },
            },
            auto_use_item: {
              type: 'boolean',
              description: 'Automatically use/consume item rewards when task is completed',
            },
            frozen: {
              type: 'boolean',
              description: 'Freeze status for repeating tasks',
            },
          },
        },
      },
      {
        name: 'add_shop_item', //TODO - Test that this skill works properly
        description:
          'Create a new shop item with price, stock, effects, and purchase limits. ' +
          'Items can have custom usage effects like coin rewards, exp bonuses, or special actions.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Item name (required)',
            },
            desc: {
              type: 'string',
              description: 'Item description',
            },
            icon: {
              type: 'string',
              description: 'Icon URL',
            },
            title_color_string: {
              type: 'string',
              description: 'Title color in hex format (e.g., "#66CCFF")',
            },
            price: {
              type: 'number',
              description: 'Purchase price in coins (default: 0)',
            },
            stock_number: {
              type: 'number',
              description: 'Initial stock quantity (-1 for unlimited, default: -1)',
            },
            action_text: {
              type: 'string',
              description: 'Custom text for use button',
            },
            disable_purchase: {
              type: 'boolean',
              description: 'Disable purchasing (default: false)',
            },
            disable_use: {
              type: 'boolean',
              description: 'Disable using (default: false)',
            },
            category: {
              type: 'number',
              description: 'Category ID (0 for default)',
            },
            effects: {
              type: 'array',
              description: 'Item usage effects. Example: [{"type":2,"info":{"min":100,"max":200}}] for coin reward',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'number', description: 'Effect type: 0=none, 1=unusable, 2=increase coins, 3=decrease coins, 4=increase exp, 5=decrease exp, 6=synthesis, 7=loot box, 8=countdown, 9=web link' },
                  info: { type: 'object', description: 'Effect parameters (varies by type)' },
                },
              },
            },
            purchase_limit: {
              type: 'array',
              description: 'Purchase frequency limits. Example: [{"type":"daily","value":5}]',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['daily', 'total'] },
                  value: { type: 'number' },
                },
              },
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'edit_shop_item', //TODO - Test that this skill works properly
        description:
          'Modify an existing shop item. Can adjust price, stock, owned quantity, effects, and other properties. ' +
          'Supports both absolute setting and relative adjustments for numeric values.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Item ID (one of id or name required)',
            },
            name: {
              type: 'string',
              description: 'Item name for fuzzy search (one of id or name required)',
            },
            set_name: {
              type: 'string',
              description: 'Set new item name',
            },
            set_desc: {
              type: 'string',
              description: 'Set new description',
            },
            set_price: {
              type: 'number',
              description: 'Adjust price (use set_price_type to specify how)',
            },
            set_price_type: {
              type: 'string',
              enum: ['absolute', 'relative'],
              description: 'Price adjustment: absolute=set directly, relative=add/subtract',
            },
            stock_number: {
              type: 'number',
              description: 'Adjust stock (-1 for unlimited)',
            },
            stock_number_type: {
              type: 'string',
              enum: ['absolute', 'relative'],
              description: 'Stock adjustment: absolute=set directly, relative=add/subtract',
            },
            own_number: {
              type: 'number',
              description: 'Adjust owned quantity',
            },
            own_number_type: {
              type: 'string',
              enum: ['absolute', 'relative'],
              description: 'Owned quantity adjustment: absolute=set directly, relative=add/subtract',
            },
            disable_purchase: {
              type: 'boolean',
              description: 'Enable/disable purchasing',
            },
            disable_use: {
              type: 'boolean',
              description: 'Enable/disable using',
            },
            effects: {
              type: 'array',
              description: 'Set item usage effects (replaces existing)',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'number' },
                  info: { type: 'object' },
                },
              },
            },
          },
        },
      },
      {
        name: 'apply_penalty', //TODO - Test that this skill works properly
        description:
          'Apply a penalty to the player (coins, experience points, or items) with a custom reason. ' +
          'The reason will be displayed in history pages. Use this to subtract resources directly.',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['coin', 'exp', 'item'],
              description: 'Penalty type: coin=coins, exp=experience points, item=shop items',
            },
            content: {
              type: 'string',
              description: 'Reason for penalty (displayed in history)',
            },
            number: {
              type: 'number',
              description: 'Amount to penalize (max: 999999 for coin, 99999 for exp, 999 for items)',
            },
            skills: {
              type: 'array',
              items: { type: 'number' },
              description: 'Skill/attribute IDs (only for exp type)',
            },
            item_id: {
              type: 'number',
              description: 'Item ID (only for item type, one of item_id or item_name required)',
            },
            item_name: {
              type: 'string',
              description: 'Item name for fuzzy match (only for item type, one of item_id or item_name required)',
            },
            silent: {
              type: 'boolean',
              description: 'Disable UI prompts (default: false)',
            },
          },
          required: ['type', 'content', 'number'],
        },
      },
      {
        name: 'edit_skill', //TODO - Test that this skill works properly
        description:
          'Create a new skill or edit an existing skill (name, icon, color, experience). ' +
          'Can also delete skills. Skills represent character attributes that can be leveled up.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Skill ID (required for editing/deleting existing skills)',
            },
            content: {
              type: 'string',
              description: 'Skill name (required when creating new skill)',
            },
            desc: {
              type: 'string',
              description: 'Skill description',
            },
            icon: {
              type: 'string',
              description: 'Icon (can use emoji like 💻)',
            },
            color: {
              type: 'string',
              description: 'Skill color in hex format (e.g., "#FF6B6B")',
            },
            exp: {
              type: 'number',
              description: 'Experience points for this skill',
            },
            delete: {
              type: 'boolean',
              description: 'Delete flag (only valid when id is provided, default: false)',
            },
          },
        },
      },
    ];

    // Filter out edit/delete tools if in safe mode (create tools still allowed)
    if (configManager.isSafeMode()) {
      return allTools.filter(tool => !isEditDeleteTool(tool.name));
    }

    return allTools;
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
      configManager.logIfDebug('LifeUp MCP Server is now ready to handle requests');

      // Keep the process alive indefinitely
      // The connect() call sets up the stdio handlers, but the promise resolves
      // once the connection is established. We need to prevent the process from exiting.
      await new Promise(() => {
        // This promise never resolves, keeping the process alive
      });
    } catch (error) {
      console.error('Error during server connection:', error);
      throw error;
    }
  }
}

// Global error handlers to prevent unhandled rejections from crashing
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  console.error('Exiting due to unhandled rejection to prevent running in corrupted state');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  console.error('Exiting due to uncaught exception to prevent running in corrupted state');
  process.exit(1);
});

// Main entry point
const server = new LifeUpServer();
server.start().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
