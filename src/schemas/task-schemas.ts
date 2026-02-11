/**
 * Task Tool Schemas
 * Exported as reusable constants to keep server.ts clean
 */

export const CREATE_TASK_TOOL = {
  name: 'create_task',
  description:
    'Create a new task in LifeUp. Specify task name and optional rewards (experience points and coins). ' +
    'When setting XP, you must provide skillIds to indicate which attributes receive the XP. ' +
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
        description:
          'Experience points reward (optional, non-negative). If specified, must provide skillIds to indicate which attributes receive the XP. When omitted, defaults to 0.',
      },
      skillIds: {
        type: 'array',
        items: {
          type: 'number',
        },
        description:
          'Skill/attribute IDs to receive XP rewards. Required when setting exp parameter. Supports multiple values (e.g., [1, 2, 3]).',
      },
      coin: {
        type: 'number',
        description: 'Coin reward (optional, non-negative)',
      },
      categoryId: {
        type: 'number',
        description: 'Category/list ID to place the task in (optional)',
      },
      content: {
        type: 'string',
        description: 'Task description/content (optional, max 1000 characters)',
      },
      auto_use_item: {
        type: 'boolean',
        description:
          'Automatically use/consume item rewards when task is completed (optional, defaults to false)',
      },
      task_type: {
        type: 'number',
        description:
          'Task type: 0=normal (default), 1=count task, 2=negative task, 3=API task. Count tasks can be completed multiple times. Requires LifeUp v1.99.1+',
      },
      target_times: {
        type: 'number',
        description:
          'Target count for count tasks (required when task_type=1, must be > 0). Example: Set to 5 to create a task that needs to be completed 5 times.',
      },
      is_affect_shop_reward: {
        type: 'boolean',
        description:
          'Whether count affects shop item reward calculations (optional, only valid when task_type=1, defaults to false)',
      },
      importance: {
        type: 'number',
        description:
          'Task importance level: 1=Low, 2=Normal, 3=High, 4=Critical (optional, defaults to 1)',
        minimum: 1,
        maximum: 4,
      },
      difficulty: {
        type: 'number',
        description:
          'Task difficulty level: 1=Easy, 2=Normal, 3=Hard, 4=Very Hard (optional, defaults to 1)',
        minimum: 1,
        maximum: 4,
      },
      subtasks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            todo: {
              type: 'string',
              description: 'Subtask content/description (required, max 200 characters)',
            },
            order: {
              type: 'number',
              description: 'Position/order of subtask (optional)',
            },
            coin: {
              type: 'number',
              description: 'Coin reward for subtask (optional, 0-999999)',
            },
            coin_var: {
              type: 'number',
              description: 'Coin variance (optional)',
            },
            exp: {
              type: 'number',
              description: 'Experience reward for subtask (optional, 0-99999)',
            },
            auto_use_item: {
              type: 'boolean',
              description: 'Auto-use item rewards (optional)',
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
              description: 'Amount of item (optional, 1-99)',
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
          required: ['todo'],
        },
        description:
          'Array of subtasks to create with the main task (optional, max 50 subtasks)',
      },
    },
    required: ['name'],
  },
};

export const LIST_ALL_TASKS_TOOL = {
  name: 'list_all_tasks',
  description:
    'List all tasks from your LifeUp app. Returns active and completed tasks, showing task names, ' +
    'descriptions, and rewards. Useful for reviewing your current workload or understanding task patterns.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export const SEARCH_TASKS_TOOL = {
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
};

export const GET_TASK_HISTORY_TOOL = {
  name: 'get_task_history',
  description:
    'Retrieve your task completion history. Shows recently completed tasks with timestamps and rewards earned. ' +
    'Helpful for understanding your productivity patterns and accomplishments.',
  inputSchema: {
    type: 'object',
    properties: {
      taskId: {
        type: 'number',
        description: 'Task ID to get history for (optional - if omitted, returns global task history)',
      },
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
};

export const GET_TASK_CATEGORIES_TOOL = {
  name: 'get_task_categories',
  description: 'List all task categories/lists available in your LifeUp app.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export const DELETE_TASK_TOOL = {
  name: 'delete_task',
  description:
    '⚠️ Permanently delete a task from your LifeUp app. This action cannot be undone. ' +
    'Requires explicit task ID to prevent accidental deletions. This tool is blocked in SAFE_MODE.',
  inputSchema: {
    type: 'object',
    properties: {
      taskId: {
        type: 'number',
        description: 'ID of the task to delete (required)',
      },
    },
    required: ['taskId'],
  },
};

export const EDIT_TASK_TOOL = {
  name: 'edit_task',
  description:
    'Edit an existing task in LifeUp. You can modify task name, rewards, category, and other properties. ' +
    'When using exp_set_type="rel" or coin_set_type="rel", the exp and coin values are added to existing values. ' +
    'When using "abs" (absolute), values replace existing ones. This tool is blocked in SAFE_MODE.',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Task ID to edit (required)',
      },
      name: {
        type: 'string',
        description: 'New task name (optional)',
      },
      content: {
        type: 'string',
        description: 'New task description/content (optional)',
      },
      exp: {
        type: 'number',
        description:
          'New XP reward value. Use exp_set_type to control if this is absolute or relative to current value (optional)',
      },
      coin: {
        type: 'number',
        description:
          'New coin reward value. Use coin_set_type to control if this is absolute or relative to current value (optional)',
      },
      skills: {
        type: 'array',
        items: {
          type: 'number',
        },
        description: 'Skill/attribute IDs to receive XP rewards (optional)',
      },
      categoryId: {
        type: 'number',
        description: 'Category/list ID to move task to (optional)',
      },
      auto_use_item: {
        type: 'boolean',
        description: 'Auto-use item rewards (optional)',
      },
      task_type: {
        type: 'number',
        description: 'Task type: 0=normal, 1=count task, 2=negative, 3=API task (optional)',
      },
      target_times: {
        type: 'number',
        description: 'Target count for count tasks (optional, must be > 0 when task_type=1)',
      },
      is_affect_shop_reward: {
        type: 'boolean',
        description: 'Whether count affects shop rewards (optional)',
      },
      importance: {
        type: 'number',
        description: 'Task importance: 1=Low, 2=Normal, 3=High, 4=Critical (optional)',
        minimum: 1,
        maximum: 4,
      },
      difficulty: {
        type: 'number',
        description: 'Task difficulty: 1=Easy, 2=Normal, 3=Hard, 4=Very Hard (optional)',
        minimum: 1,
        maximum: 4,
      },
      exp_set_type: {
        type: 'string',
        enum: ['absolute', 'relative'],
        description: 'How to apply exp value: "absolute" replaces current, "relative" adds to current (optional, default: absolute)',
      },
      coin_set_type: {
        type: 'string',
        enum: ['absolute', 'relative'],
        description: 'How to apply coin value: "absolute" replaces current, "relative" adds to current (optional, default: absolute)',
      },
    },
    required: ['id'],
  },
};
