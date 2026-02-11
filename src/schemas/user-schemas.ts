/**
 * User Info Tool Schemas
 * Exported as reusable constants to keep server.ts clean
 */

export const LIST_SKILLS_TOOL = {
  name: 'list_skills',
  description:
    'List all character skills with their current levels, experience points, and progress toward the next level. ' +
    'Useful for understanding your character progression and which skills to focus on.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export const GET_USER_INFO_TOOL = {
  name: 'get_user_info',
  description:
    'Get user profile information including player name, character level, total experience, and app version. ' +
    'Useful for understanding the current state of your LifeUp account.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export const GET_COIN_BALANCE_TOOL = {
  name: 'get_coin_balance',
  description:
    'Get your current coin balance and currency information. Coins are the in-game currency used to purchase items from the shop. ' +
    'Useful for planning purchases and understanding your economy.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};
