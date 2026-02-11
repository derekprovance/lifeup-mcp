/**
 * MCP Server implementation for LifeUp Cloud API
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
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
// Import tool schemas from dedicated files
import * as taskSchemas from './schemas/task-schemas.js';
import * as achievementSchemas from './schemas/achievement-schemas.js';
import * as userSchemas from './schemas/user-schemas.js';
import * as shopSchemas from './schemas/shop-schemas.js';
import * as mutationSchemas from './schemas/mutation-schemas.js';
import * as subtaskSchemas from './schemas/subtask-schemas.js';

// Tools that create new entities - allowed in SAFE_MODE
const CREATE_TOOLS = ['create_task', 'create_achievement', 'add_shop_item'] as const;

// Tools that modify or delete existing entities - blocked in SAFE_MODE
const EDIT_DELETE_TOOLS = [
  'edit_task',
  'delete_task',
  'update_achievement',
  'delete_achievement',
  'edit_shop_item',
  'apply_penalty',
  'edit_skill',
  'edit_subtask',
] as const;

type EditDeleteTool = (typeof EDIT_DELETE_TOOLS)[number];

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
    (this.server.setRequestHandler as unknown as Function)(ListToolsSchema, async () => {
      return {
        tools: this.getTools(),
      };
    });

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
                text:
                  `❌ Operation blocked: "${request.params.name}" is disabled in SAFE_MODE.\n\n` +
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

            case 'get_task_details':
              result = await TaskTools.getTaskDetails(request.params.arguments);
              break;

            case 'delete_task':
              result = await TaskTools.deleteTask(request.params.arguments);
              break;

            case 'create_subtask':
              result = await TaskTools.createSubtask(request.params.arguments);
              break;

            case 'edit_subtask':
              result = await TaskTools.editSubtask(request.params.arguments);
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
    // Build tools array from imported schemas
    const allTools = [
      // Task tools
      taskSchemas.CREATE_TASK_TOOL,
      taskSchemas.LIST_ALL_TASKS_TOOL,
      taskSchemas.SEARCH_TASKS_TOOL,
      taskSchemas.GET_TASK_HISTORY_TOOL,
      taskSchemas.GET_TASK_CATEGORIES_TOOL,
      taskSchemas.DELETE_TASK_TOOL,
      taskSchemas.EDIT_TASK_TOOL,
      // Subtask tools
      subtaskSchemas.CREATE_SUBTASK_TOOL,
      subtaskSchemas.EDIT_SUBTASK_TOOL,
      subtaskSchemas.GET_TASK_DETAILS_TOOL,
      // Achievement tools
      achievementSchemas.LIST_ACHIEVEMENTS_TOOL,
      achievementSchemas.MATCH_TASK_TO_ACHIEVEMENTS_TOOL,
      achievementSchemas.LIST_ACHIEVEMENT_CATEGORIES_TOOL,
      achievementSchemas.CREATE_ACHIEVEMENT_TOOL,
      achievementSchemas.UPDATE_ACHIEVEMENT_TOOL,
      achievementSchemas.DELETE_ACHIEVEMENT_TOOL,
      // User tools
      userSchemas.LIST_SKILLS_TOOL,
      userSchemas.GET_USER_INFO_TOOL,
      userSchemas.GET_COIN_BALANCE_TOOL,
      // Shop tools
      shopSchemas.LIST_SHOP_ITEMS_TOOL,
      shopSchemas.GET_SHOP_CATEGORIES_TOOL,
      shopSchemas.SEARCH_SHOP_ITEMS_TOOL,
      // Mutation tools
      mutationSchemas.ADD_SHOP_ITEM_TOOL,
      mutationSchemas.EDIT_SHOP_ITEM_TOOL,
      mutationSchemas.APPLY_PENALTY_TOOL,
      subtaskSchemas.EDIT_SKILL_TOOL,
    ];


    // Filter out edit/delete tools if in safe mode (create tools still allowed)
    if (configManager.isSafeMode()) {
      return allTools.filter((tool) => !isEditDeleteTool(tool.name));
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
