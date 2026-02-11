/**
 * Subtask Tool Schemas
 * Exported as reusable constants to keep server.ts clean
 */

export const CREATE_SUBTASK_TOOL = {
  name: 'create_subtask',
  description:
    'Create a new subtask for an existing task in LifeUp. Subtasks are smaller action items that belong to a parent task. ' +
    'You must specify the parent task using at least one identifier (main_id, main_gid, or main_name). ' +
    'Subtasks can have their own rewards, reminders, and item rewards.',
  inputSchema: {
    type: 'object',
    properties: {
      main_id: {
        type: 'number',
        description: 'Parent task ID (one of main_id, main_gid, or main_name is required)',
      },
      main_gid: {
        type: 'number',
        description:
          'Parent task group ID (one of main_id, main_gid, or main_name is required)',
      },
      main_name: {
        type: 'string',
        description: 'Parent task name (one of main_id, main_gid, or main_name is required)',
      },
      todo: {
        type: 'string',
        description: 'Subtask content/description (required, max 200 characters)',
      },
      order: {
        type: 'number',
        description: 'Position/order of subtask in the list (optional)',
      },
      coin: {
        type: 'number',
        description: 'Coin reward for completing this subtask (optional, 0-999999)',
      },
      coin_var: {
        type: 'number',
        description: 'Coin variance/randomness (optional)',
      },
      exp: {
        type: 'number',
        description: 'Experience points reward (optional, 0-99999)',
      },
      auto_use_item: {
        type: 'boolean',
        description:
          'Automatically use/consume item rewards when subtask is completed (optional)',
      },
      item_id: {
        type: 'number',
        description: 'Item ID for reward (optional, one of item_id or item_name)',
      },
      item_name: {
        type: 'string',
        description: 'Item name for reward (optional, one of item_id or item_name)',
      },
      item_amount: {
        type: 'number',
        description: 'Amount of item to reward (optional, 1-99)',
      },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            item_id: { type: 'number' },
            amount: { type: 'number' },
          },
          required: ['item_id', 'amount'],
        },
        description: 'Array of item rewards (optional, alternative to item_id/item_name)',
      },
    },
    required: ['todo'],
  },
};

export const EDIT_SUBTASK_TOOL = {
  name: 'edit_subtask',
  description:
    'Edit an existing subtask in LifeUp. You must specify both the parent task (using main_id, main_gid, or main_name) ' +
    'and the subtask to edit (using edit_id, edit_gid, or edit_name). Supports both absolute and relative value adjustments ' +
    'for coin and experience rewards.',
  inputSchema: {
    type: 'object',
    properties: {
      main_id: {
        type: 'number',
        description: 'Parent task ID (one of main_id, main_gid, or main_name is required)',
      },
      main_gid: {
        type: 'number',
        description:
          'Parent task group ID (one of main_id, main_gid, or main_name is required)',
      },
      main_name: {
        type: 'string',
        description: 'Parent task name (one of main_id, main_gid, or main_name is required)',
      },
      edit_id: {
        type: 'number',
        description:
          'Subtask ID to edit (one of edit_id, edit_gid, or edit_name is required)',
      },
      edit_gid: {
        type: 'number',
        description:
          'Subtask group ID to edit (one of edit_id, edit_gid, or edit_name is required)',
      },
      edit_name: {
        type: 'string',
        description:
          'Subtask name to edit (one of edit_id, edit_gid, or edit_name is required)',
      },
      todo: {
        type: 'string',
        description: 'Updated subtask content/description (optional, max 200 characters)',
      },
      order: {
        type: 'number',
        description: 'Position/order of subtask in the list (optional)',
      },
      coin: {
        type: 'number',
        description: 'Coin reward (optional, 0-999999)',
      },
      coin_var: {
        type: 'number',
        description: 'Coin variance/randomness (optional)',
      },
      exp: {
        type: 'number',
        description: 'Experience points reward (optional, 0-99999)',
      },
      coin_set_type: {
        type: 'string',
        enum: ['absolute', 'relative'],
        description: 'How to apply coin value: absolute (replace) or relative (add/subtract)',
      },
      exp_set_type: {
        type: 'string',
        enum: ['absolute', 'relative'],
        description: 'How to apply exp value: absolute (replace) or relative (add/subtract)',
      },
      auto_use_item: {
        type: 'boolean',
        description:
          'Automatically use/consume item rewards when subtask is completed (optional)',
      },
      item_id: {
        type: 'number',
        description: 'Item ID for reward (optional)',
      },
      item_name: {
        type: 'string',
        description: 'Item name for reward (optional)',
      },
      item_amount: {
        type: 'number',
        description: 'Amount of item to reward (optional, 1-99)',
      },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            item_id: { type: 'number' },
            amount: { type: 'number' },
          },
          required: ['item_id', 'amount'],
        },
        description: 'Array of item rewards (optional)',
      },
    },
    required: [],
  },
};

export const GET_TASK_DETAILS_TOOL = {
  name: 'get_task_details',
  description:
    'Get detailed information about a specific task, including rewards, subtasks, timestamps, and completion history. ' +
    'Requires task ID.',
  inputSchema: {
    type: 'object',
    properties: {
      taskId: {
        type: 'number',
        description: 'Task ID (required)',
      },
      includeHistory: {
        type: 'boolean',
        description: 'Include completion history (optional, default: true)',
      },
      historyLimit: {
        type: 'number',
        description: 'Maximum history records to return (optional, default: 10)',
      },
    },
    required: ['taskId'],
  },
};

export const EDIT_SKILL_TOOL = {
  name: 'edit_skill',
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
};
