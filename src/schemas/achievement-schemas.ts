/**
 * Achievement Tool Schemas
 * Exported as reusable constants to keep server.ts clean
 */

export const LIST_ACHIEVEMENTS_TOOL = {
  name: 'list_achievements',
  description:
    'List all available achievements in your LifeUp app. Shows both unlocked and locked achievements ' +
    'with their descriptions and progress. If full achievement data is unavailable in your LifeUp version, ' +
    'shows achievement categories instead.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export const MATCH_TASK_TO_ACHIEVEMENTS_TOOL = {
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
};

export const LIST_ACHIEVEMENT_CATEGORIES_TOOL = {
  name: 'list_achievement_categories',
  description:
    'List all achievement categories. Categories help organize achievements and are needed when creating new achievements. ' +
    'Shows category names, IDs, and descriptions.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export const CREATE_ACHIEVEMENT_TOOL = {
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
        description:
          'Unlock conditions as JSON array (optional). Format: [{"type":7,"target":1000000}]. ' +
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
        description:
          'Experience points reward (optional). IMPORTANT: Must specify skills array to apply XP to attributes.',
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
        description:
          'Skill/attribute IDs to receive XP rewards. Required when setting exp parameter. Without skills, XP cannot be applied.',
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
};

export const UPDATE_ACHIEVEMENT_TOOL = {
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
        description:
          'Experience reward (optional). IMPORTANT: Must specify skills array to apply XP to attributes.',
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
        description:
          'Skill/attribute IDs to receive XP rewards. Required when setting exp parameter (replaces existing). Without skills, XP cannot be applied.',
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
};

export const DELETE_ACHIEVEMENT_TOOL = {
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
};
