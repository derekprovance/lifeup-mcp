/**
 * Task management tools for MCP
 */

import { lifeupClient } from '../client/lifeup-client.js';
import { configManager } from '../config/config.js';
import {
  CreateTaskSchema,
  SearchTasksSchema,
  TaskHistorySchema,
  GetTaskDetailsSchema,
  DeleteTaskSchema,
  type CreateTaskInput,
  type SearchTasksInput,
  type TaskHistoryInput,
  type GetTaskDetailsInput,
} from '../config/validation.js';
import * as Types from '../client/types.js';
import { TASK_STATUS } from '../client/constants.js';
import { ensureServerHealthy, handleToolError } from './tool-helpers.js';

/**
 * Format frequency enum to human-readable string
 */
function formatFrequency(frequency: number): string {
  if (frequency === 0) return 'Once';
  if (frequency === 1) return 'Daily';
  if (frequency > 1) return `Every ${frequency} days`;
  if (frequency === -1) return 'Unlimited';
  if (frequency === -3) return 'Ebbinghaus';
  if (frequency === -4) return 'Monthly';
  if (frequency === -5) return 'Yearly';
  return `Unknown (${frequency})`;
}

/**
 * Format timestamp to human-readable date string
 */
function formatTimestamp(timestamp: number | null | undefined, label: string): string {
  if (!timestamp) return '';
  return `  **${label}**: ${new Date(timestamp).toLocaleString()}\n`;
}

/**
 * Format subtasks with completion status
 */
function formatSubTasks(subTasks: Types.SubTask[]): string {
  if (!subTasks || subTasks.length === 0) return '';

  const completed = subTasks.filter((st) => st.status === 1).length;
  let result = `  **Subtasks**: ${completed}/${subTasks.length} complete\n`;

  subTasks.forEach((subtask) => {
    const checkbox = subtask.status === 1 ? '✓' : ' ';
    result += `    [${checkbox}] ${subtask.todo} (ID: ${subtask.id})`;

    // Show subtask rewards if they exist
    if (subtask.exp || subtask.coin) {
      result += ` - Rewards: ${subtask.exp || 0}XP, ${subtask.coin || 0} coin`;
    }
    result += '\n';
  });

  return result;
}

/**
 * Format skills and item rewards
 */
function formatSkillsAndItems(skillIds: number[], items: any[]): string {
  let result = '';

  if (skillIds && skillIds.length > 0) {
    result += `  **Skills**: ${skillIds.join(', ')}\n`;
  }

  if (items && items.length > 0) {
    result += `  **Item Rewards**: ${items.length} item(s)\n`;
    items.forEach((item: any, index: number) => {
      if (item.item_id !== undefined && item.amount !== undefined) {
        result += `    - Item ${item.item_id} x${item.amount}\n`;
      } else if (item.itemId !== undefined && item.amount !== undefined) {
        // API might use itemId instead of item_id
        result += `    - Item ${item.itemId} x${item.amount}\n`;
      } else {
        result += `    - Item ${index + 1}\n`;
      }
    });
  }

  return result;
}

/**
 * Format comprehensive task details for display
 */
function formatTaskDetails(task: Types.Task, includeStatus: boolean = true): string {
  let result = '';

  // Basic info with status indicator
  const statusIndicator = includeStatus
    ? (task.status === TASK_STATUS.ACTIVE ? '○' : '✓') + ' '
    : '';
  result += `${statusIndicator}**${task.name}** (ID: ${task.id})\n`;

  // Description
  if (task.content) {
    result += `  ${task.content}\n`;
  }

  // Rewards
  if (task.exp || task.coin) {
    result += `  **Rewards**: ${task.exp || 0}XP, ${task.coin || 0} coin`;
    if (task.coinVariable) {
      result += ` (+/- ${task.coinVariable})`;
    }
    result += '\n';
  }

  // Skills and Items
  result += formatSkillsAndItems(task.skillIds, task.items);

  // Subtasks
  result += formatSubTasks(task.subTasks);

  // Timing information
  result += formatTimestamp(task.deadline || task.due_date, 'Deadline');
  result += formatTimestamp(task.remindTime, 'Reminder');
  result += formatTimestamp(task.created_time, 'Created');
  result += formatTimestamp(task.update_time, 'Updated');

  // Recurring task info
  if (task.frequency !== 0) {
    result += `  **Frequency**: ${formatFrequency(task.frequency)}\n`;
  }
  if (task.gid && task.frequency !== 0) {
    result += `  **Recurring Group ID**: ${task.gid}\n`;
  }

  return result;
}

/**
 * Format minimal task summary for list views (no description, no detailed fields)
 * Only shows: name, ID, status, deadline (if set), and rewards
 */
function formatTaskSummary(task: Types.Task, includeStatus: boolean = true): string {
  let result = '';

  // Basic info with status indicator
  const statusIndicator = includeStatus
    ? (task.status === TASK_STATUS.ACTIVE ? '○' : '✓') + ' '
    : '';
  result += `${statusIndicator}**${task.name}** (ID: ${task.id})`;

  // Rewards on same line
  if (task.exp || task.coin) {
    result += ` - ${task.exp || 0}XP, ${task.coin || 0} coin`;
    if (task.coinVariable) {
      result += ` (+/- ${task.coinVariable})`;
    }
  }
  result += '\n';

  // Deadline if set (only timing info shown in summary)
  if (task.deadline || task.due_date) {
    result += `  **Deadline**: ${new Date(task.deadline || task.due_date!).toLocaleString()}\n`;
  }

  return result;
}

export class TaskTools {
  /**
   * Create a new task in LifeUp
   */
  static async createTask(input: unknown): Promise<string> {
    try {
      const validated = CreateTaskSchema.parse(input);
      configManager.logIfDebug('Creating task:', validated);

      await ensureServerHealthy();

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
      return handleToolError(error, 'creating task');
    }
  }

  /**
   * List all tasks
   */
  static async listAllTasks(): Promise<string> {
    try {
      await ensureServerHealthy();

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
        result += `### Active Tasks\n\n`;
        active.slice(0, 20).forEach((task) => {
          result += formatTaskSummary(task, false);
        });
        if (active.length > 20) {
          result += `... and ${active.length - 20} more active tasks\n`;
        }
      }

      if (completed.length > 0 && completed.length <= 10) {
        result += `\n### Recently Completed (showing ${completed.length})\n\n`;
        completed.forEach((task) => {
          result += formatTaskSummary(task, false);
        });
      }

      return result;
    } catch (error) {
      return handleToolError(error, 'fetching tasks');
    }
  }

  /**
   * Search tasks by criteria
   */
  static async searchTasks(input: unknown): Promise<string> {
    try {
      const validated = SearchTasksSchema.parse(input);
      configManager.logIfDebug('Searching tasks:', validated);

      await ensureServerHealthy();

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
        result += formatTaskSummary(task, true);
      });

      if (tasks.length > 20) {
        result += `... and ${tasks.length - 20} more results`;
      }

      return result;
    } catch (error) {
      return handleToolError(error, 'searching tasks');
    }
  }

  /**
   * Get task history / completed tasks
   */
  static async getTaskHistory(input: unknown = {}): Promise<string> {
    try {
      const validated = TaskHistorySchema.parse(input);
      configManager.logIfDebug('Fetching task history:', validated);

      await ensureServerHealthy();

      const history = await lifeupClient.getTaskHistory(validated.offset, validated.limit);

      if (history.length === 0) {
        return 'No task history found.';
      }

      let result = `## Task History\n\n`;
      result += `Showing ${history.length} completed tasks\n\n`;

      history.forEach((record) => {
        const date = new Date(record.completedTime || record.time || 0).toLocaleString();
        result += `- **${record.taskName || 'Unknown'}** (${date})\n`;
        if (record.exp) result += `  +${record.exp} XP\n`;
        if (record.coin) result += `  +${record.coin} coin\n`;
      });

      return result;
    } catch (error) {
      return handleToolError(error, 'fetching task history');
    }
  }

  /**
   * Get task categories
   */
  static async getTaskCategories(): Promise<string> {
    try {
      await ensureServerHealthy();

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
      return handleToolError(error, 'fetching task categories');
    }
  }

  /**
   * Delete a task by ID
   */
  static async deleteTask(input: unknown): Promise<string> {
    try {
      const validated = DeleteTaskSchema.parse(input);
      configManager.logIfDebug('Deleting task:', validated);

      await ensureServerHealthy();

      const response = await lifeupClient.deleteTask(validated);

      return (
        `✓ Task deleted successfully!\n\n` +
        `**Task ID**: ${validated.id}\n` +
        `**Note**: This action is permanent and cannot be undone.`
      );
    } catch (error) {
      return handleToolError(error, 'deleting task');
    }
  }

  /**
   * Get detailed information for a specific task by ID
   */
  static async getTaskDetails(input: unknown): Promise<string> {
    try {
      const validated = GetTaskDetailsSchema.parse(input);
      configManager.logIfDebug('Getting task details:', validated);

      await ensureServerHealthy();

      // Fetch all tasks and find the requested one
      const tasks = await lifeupClient.getAllTasks();
      const task = tasks.find(t => t.id === validated.id);

      if (!task) {
        return `Task with ID ${validated.id} not found. Use list_all_tasks or search_tasks to find available task IDs.`;
      }

      let result = `## Task Details\n\n`;
      result += formatTaskDetails(task, true);

      return result;
    } catch (error) {
      return handleToolError(error, 'fetching task details');
    }
  }
}
