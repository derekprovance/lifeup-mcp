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
