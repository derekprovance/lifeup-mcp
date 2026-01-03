/**
 * Shop and item management tools for MCP
 */

import { lifeupClient } from '../client/lifeup-client.js';
import { configManager } from '../config/config.js';
import { SearchShopItemsSchema, type SearchShopItemsInput } from '../config/validation.js';
import * as Types from '../client/types.js';
import { ensureServerHealthy, handleToolError } from './tool-helpers.js';

export class ShopTools {
  /**
   * List all shop items
   */
  static async listShopItems(): Promise<string> {
    try {
      await ensureServerHealthy();

      const items = await lifeupClient.getShopItems();

      if (items.length === 0) {
        return 'No shop items found. The shop may be empty or not yet loaded.';
      }

      // Group items by availability
      const available = items.filter((item) => item.stockNumber > 0);
      const outOfStock = items.filter((item) => item.stockNumber === 0);

      let result = `## Shop Items\n\n`;
      result += `**Total Items**: ${items.length} | **In Stock**: ${available.length} | **Out of Stock**: ${outOfStock.length}\n\n`;

      if (available.length > 0) {
        result += `### Available Items\n`;
        available.slice(0, 30).forEach((item) => {
          result += `- **${item.name}** (ID: ${item.id})\n`;
          result += `  Price: ${item.price} coin | Stock: ${item.stockNumber}`;
          if (item.ownNumber && item.ownNumber > 0) {
            result += ` | Owned: ${item.ownNumber}`;
          }
          result += `\n`;
          if (item.desc) {
            result += `  ${item.desc}\n`;
          }
        });

        if (available.length > 30) {
          result += `\n... and ${available.length - 30} more available items\n`;
        }
      }

      if (outOfStock.length > 0 && outOfStock.length <= 10) {
        result += `\n### Out of Stock (${outOfStock.length})\n`;
        outOfStock.forEach((item) => {
          result += `- ~~${item.name}~~ (Price: ${item.price} coin)\n`;
        });
      } else if (outOfStock.length > 10) {
        result += `\n**Note**: ${outOfStock.length} items are currently out of stock\n`;
      }

      return result;
    } catch (error) {
      return handleToolError(error, 'fetching shop items');
    }
  }

  /**
   * Get shop item categories
   */
  static async getShopCategories(): Promise<string> {
    try {
      await ensureServerHealthy();

      const categories = await lifeupClient.getItemCategories();

      if (categories.length === 0) {
        return 'No shop categories found.';
      }

      let result = `## Shop Categories\n\n`;
      categories.forEach((category) => {
        result += `- **${category.name}** (ID: ${category.id})\n`;
        if (category.desc) {
          result += `  ${category.desc}\n`;
        }
      });

      return result;
    } catch (error) {
      return handleToolError(error, 'fetching shop categories');
    }
  }

  /**
   * Search and filter shop items by criteria
   */
  static async searchShopItems(input: unknown): Promise<string> {
    try {
      const validated = SearchShopItemsSchema.parse(input);
      configManager.logIfDebug('Searching shop items:', validated);

      await ensureServerHealthy();

      let items: Types.Item[] = await lifeupClient.getShopItems();

      // Apply filters
      if (validated.categoryId) {
        items = items.filter((item) => item.category_id === validated.categoryId);
      }

      if (validated.searchQuery) {
        const query = validated.searchQuery.toLowerCase();
        items = items.filter(
          (item) =>
            item.name.toLowerCase().includes(query) ||
            (item.desc && item.desc.toLowerCase().includes(query))
        );
      }

      if (validated.minPrice !== undefined) {
        items = items.filter((item) => item.price >= validated.minPrice!);
      }

      if (validated.maxPrice !== undefined) {
        items = items.filter((item) => item.price <= validated.maxPrice!);
      }

      if (items.length === 0) {
        return 'No items match your search criteria.';
      }

      let result = `## Search Results (${items.length} found)\n\n`;

      // Sort by price for easier browsing
      items.sort((a, b) => a.price - b.price);

      items.slice(0, 30).forEach((item) => {
        const status = item.stockNumber > 0 ? '✓' : '✗';
        result += `${status} **${item.name}** (ID: ${item.id})\n`;
        result += `   Price: ${item.price} coin`;
        if (item.stockNumber > 0) {
          result += ` | Stock: ${item.stockNumber}`;
        } else {
          result += ` | Out of Stock`;
        }
        if (item.ownNumber && item.ownNumber > 0) {
          result += ` | Owned: ${item.ownNumber}`;
        }
        result += `\n`;
        if (item.desc) {
          result += `   ${item.desc}\n`;
        }
      });

      if (items.length > 30) {
        result += `\n... and ${items.length - 30} more results`;
      }

      return result;
    } catch (error) {
      return handleToolError(error, 'searching shop items');
    }
  }
}
