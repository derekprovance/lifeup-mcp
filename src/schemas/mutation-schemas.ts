/**
 * Mutation Tool Schemas
 * Exported as reusable constants to keep server.ts clean
 */

export const ADD_SHOP_ITEM_TOOL = {
  name: 'add_shop_item',
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
        description:
          'Item usage effects. Example: [{"type":2,"info":{"min":100,"max":200}}] for coin reward',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'number',
              description:
                'Effect type: 0=none, 1=unusable, 2=increase coins, 3=decrease coins, 4=increase exp, 5=decrease exp, 6=synthesis, 7=loot box, 8=countdown, 9=web link',
            },
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
};

export const EDIT_SHOP_ITEM_TOOL = {
  name: 'edit_shop_item',
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
        description:
          'Owned quantity adjustment: absolute=set directly, relative=add/subtract',
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
};

export const APPLY_PENALTY_TOOL = {
  name: 'apply_penalty',
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
        description:
          'Amount to penalize (max: 999999 for coin, 99999 for exp, 999 for items)',
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
        description:
          'Item name for fuzzy match (only for item type, one of item_id or item_name required)',
      },
      silent: {
        type: 'boolean',
        description: 'Disable UI prompts (default: false)',
      },
    },
    required: ['type', 'content', 'number'],
  },
};
