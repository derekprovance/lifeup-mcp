/**
 * Shop Tool Schemas
 * Exported as reusable constants to keep server.ts clean
 */

export const LIST_SHOP_ITEMS_TOOL = {
  name: 'list_shop_items',
  description:
    'List all items available in the shop with prices, stock availability, and your owned quantity. ' +
    'Shows both in-stock and out-of-stock items. Useful for browsing available rewards and planning future purchases.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export const GET_SHOP_CATEGORIES_TOOL = {
  name: 'get_shop_categories',
  description:
    'List all shop item categories. Categories help organize items in the shop and make browsing easier.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
};

export const SEARCH_SHOP_ITEMS_TOOL = {
  name: 'search_shop_items',
  description:
    'Search and filter shop items by criteria such as name, category, or price range. ' +
    'Useful for finding specific items or comparing prices across different categories.',
  inputSchema: {
    type: 'object',
    properties: {
      searchQuery: {
        type: 'string',
        description:
          'Search for items containing this text in name or description (optional)',
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
};
