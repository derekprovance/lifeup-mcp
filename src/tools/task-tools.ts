/**
 * Task management tools for MCP
 */

import { lifeupClient } from '../client/lifeup-client.js';
import { configManager } from '../config/config.js';
import { ErrorHandler, LifeUpError } from '../error/error-handler.js';
import {
  CreateTaskSchema,
  SearchTasksSchema,
  TaskHistorySchema,
  type CreateTaskInput,
  type SearchTasksInput,
  type TaskHistoryInput,
} from '../config/validation.js';
import * as Types from '../client/types.js';
import { TASK_STATUS } from '../client/constants.js';
import { ZodError } from 'zod';

export class TaskTools {
  /**
   * Create a new task in LifeUp
   */
  static async createTask(input: unknown): Promise<string> {
    try {
      const validated = CreateTaskSchema.parse(input);
      configManager.logIfDebug('Creating task:', validated);

      // First check if server is reachable
      const isHealthy = await lifeupClient.healthCheck();
      if (!isHealthy) {
        throw new LifeUpError(
          'LifeUp server is unreachable',
          'SERVER_UNREACHABLE',
          'The LifeUp server is not responding. Please:\n' +
          '1. Ensure LifeUp is running on your Android device\n' +
          '2. Check your WiFi connection\n' +
          `3. Verify the IP address is correct (current: ${configManager.getConfig().host})\n\n` +
          'If the IP has changed, update it with:\n' +
          '  LIFEUP_HOST=<new-ip>',
          true
        );
      }

      const task = await lifeupClient.createTask(validated);

      return (
        `✓ Task created successfully!\n\n` +
        `**Task**: ${validated.name}\n` +
        `**Experience**: ${validated.exp || 0} XP\n` +
        `**Coin Reward**: ${validated.coin || 0}` +
        (validated.coinVar ? ` (+/- ${validated.coinVar})` : '') +
        `\n` +
        (validated.categoryId !== undefined ? `**Category ID**: ${validated.categoryId}\n` : '') +
        (validated.skillIds?.length ? `**Skills**: ${validated.skillIds.join(', ')}\n` : '') +
        (validated.content ? `**Description**: ${validated.content}\n` : '') +
        (validated.deadline
          ? `**Deadline**: ${new Date(validated.deadline).toLocaleString()}\n`
          : '')
      );
    } catch (error) {
      if (error instanceof LifeUpError) {
        return `❌ Error: ${ErrorHandler.formatErrorForClaude(error)}`;
      }

      if (error instanceof ZodError) {
        const messages = error.issues.map((e) => `- ${e.path.join('.')}: ${e.message}`).join('\n');
        return `❌ Invalid input:\n${messages}`;
      }

      return `❌ Unexpected error creating task: ${(error as Error).message}`;
    }
  }

  /**
   * List all tasks
   */
  static async listAllTasks(): Promise<string> {
    try {
      const isHealthy = await lifeupClient.healthCheck();
      if (!isHealthy) {
        throw new LifeUpError(
          'LifeUp server is unreachable',
          'SERVER_UNREACHABLE',
          'The LifeUp server is not responding.',
          true
        );
      }

      const tasks = await lifeupClient.getAllTasks();

      if (tasks.length === 0) {
        return 'No tasks found. You can create a task to get started!';
      }

      // Group tasks by status
      const active = tasks.filter((t) => t.status === TASK_STATUS.ACTIVE);
      const completed = tasks.filter((t) => t.status === TASK_STATUS.COMPLETED);

      let result = `## Tasks Summary\n\n`;
      result += `**Total Tasks**: ${tasks.length}\n`;
      result += `**Active**: ${active.length} | **Completed**: ${completed.length}\n\n`;

      if (active.length > 0) {
        result += `### Active Tasks\n`;
        active.slice(0, 20).forEach((task) => {
          result += `- **${task.name}** (ID: ${task.id})\n`;
          if (task.content) result += `  ${task.content}\n`;
          if (task.exp || task.coin) {
            result += `  Rewards: ${task.exp || 0}XP, ${task.coin || 0} coin\n`;
          }
        });
        if (active.length > 20) {
          result += `... and ${active.length - 20} more active tasks\n`;
        }
      }

      if (completed.length > 0 && completed.length <= 10) {
        result += `\n### Recently Completed (showing ${completed.length})\n`;
        completed.forEach((task) => {
          result += `- ~~${task.name}~~ (completed at ${new Date(task.endTime || 0).toLocaleDateString()})\n`;
        });
      }

      return result;
    } catch (error) {
      if (error instanceof LifeUpError) {
        return `❌ Error: ${ErrorHandler.formatErrorForClaude(error)}`;
      }
      return `❌ Error fetching tasks: ${(error as Error).message}`;
    }
  }

  /**
   * Search tasks by criteria
   */
  static async searchTasks(input: unknown): Promise<string> {
    try {
      const validated = SearchTasksSchema.parse(input);
      configManager.logIfDebug('Searching tasks:', validated);

      const isHealthy = await lifeupClient.healthCheck();
      if (!isHealthy) {
        throw new LifeUpError(
          'LifeUp server is unreachable',
          'SERVER_UNREACHABLE',
          'The LifeUp server is not responding.',
          true
        );
      }

      let tasks: Types.Task[] = [];

      if (validated.categoryId) {
        tasks = await lifeupClient.getTasksByCategory(validated.categoryId);
      } else {
        tasks = await lifeupClient.getAllTasks();
      }

      // Apply filters
      if (validated.status !== 'all') {
        const statusCode = validated.status === 'active' ? TASK_STATUS.ACTIVE : TASK_STATUS.COMPLETED;
        tasks = tasks.filter((t) => t.status === statusCode);
      }

      if (validated.searchQuery) {
        const query = validated.searchQuery.toLowerCase();
        tasks = tasks.filter(
          (t) =>
            t.name.toLowerCase().includes(query) ||
            (t.content && t.content.toLowerCase().includes(query)) ||
            (t.notes && t.notes.toLowerCase().includes(query))
        );
      }

      if (validated.deadlineBefore) {
        tasks = tasks.filter(
          (t) => (t.deadline || t.due_date) && (t.deadline || t.due_date)! < validated.deadlineBefore!
        );
      }

      if (tasks.length === 0) {
        return 'No tasks matching your search criteria.';
      }

      let result = `## Search Results (${tasks.length} found)\n\n`;
      tasks.slice(0, 20).forEach((task) => {
        const status = task.status === TASK_STATUS.ACTIVE ? '○' : '✓';
        result += `${status} **${task.name}** (ID: ${task.id})\n`;
        if (task.content) result += `   ${task.content}\n`;
        if (task.exp || task.coin) {
          result += `   Rewards: ${task.exp || 0}XP, ${task.coin || 0} coin\n`;
        }
      });

      if (tasks.length > 20) {
        result += `\n... and ${tasks.length - 20} more results`;
      }

      return result;
    } catch (error) {
      if (error instanceof LifeUpError) {
        return `❌ Error: ${ErrorHandler.formatErrorForClaude(error)}`;
      }

      if (error instanceof ZodError) {
        const messages = error.issues.map((e) => `- ${e.path.join('.')}: ${e.message}`).join('\n');
        return `❌ Invalid input:\n${messages}`;
      }

      return `❌ Error searching tasks: ${(error as Error).message}`;
    }
  }

  /**
   * Get task history / completed tasks
   */
  static async getTaskHistory(input: unknown = {}): Promise<string> {
    try {
      const validated = TaskHistorySchema.parse(input);
      configManager.logIfDebug('Fetching task history:', validated);

      const isHealthy = await lifeupClient.healthCheck();
      if (!isHealthy) {
        throw new LifeUpError(
          'LifeUp server is unreachable',
          'SERVER_UNREACHABLE',
          'The LifeUp server is not responding.',
          true
        );
      }

      const history = await lifeupClient.getTaskHistory(validated.offset, validated.limit);

      if (history.length === 0) {
        return 'No task history found.';
      }

      let result = `## Task History\n\n`;
      result += `Showing ${history.length} completed tasks\n\n`;

      history.forEach((record: any) => {
        const date = new Date(record.completedTime || record.time || 0).toLocaleString();
        result += `- **${record.taskName || 'Unknown'}** (${date})\n`;
        if (record.exp) result += `  +${record.exp} XP\n`;
        if (record.coin) result += `  +${record.coin} coin\n`;
      });

      return result;
    } catch (error) {
      if (error instanceof LifeUpError) {
        return `❌ Error: ${ErrorHandler.formatErrorForClaude(error)}`;
      }

      if (error instanceof ZodError) {
        const messages = error.issues.map((e) => `- ${e.path.join('.')}: ${e.message}`).join('\n');
        return `❌ Invalid input:\n${messages}`;
      }

      return `❌ Error fetching history: ${(error as Error).message}`;
    }
  }

  /**
   * Get task categories
   */
  static async getTaskCategories(): Promise<string> {
    try {
      const isHealthy = await lifeupClient.healthCheck();
      if (!isHealthy) {
        throw new LifeUpError(
          'LifeUp server is unreachable',
          'SERVER_UNREACHABLE',
          'The LifeUp server is not responding.',
          true
        );
      }

      const categories = await lifeupClient.getTaskCategories();

      if (categories.length === 0) {
        return 'No task categories found.';
      }

      let result = `## Task Categories\n\n`;
      categories.forEach((category) => {
        result += `- **${category.name}** (ID: ${category.id})\n`;
        if (category.desc) result += `  ${category.desc}\n`;
      });

      return result;
    } catch (error) {
      if (error instanceof LifeUpError) {
        return `❌ Error: ${ErrorHandler.formatErrorForClaude(error)}`;
      }
      return `❌ Error fetching categories: ${(error as Error).message}`;
    }
  }
}
