/**
 * Mutation tools for modifying LifeUp data
 */

import { lifeupClient } from '../client/lifeup-client.js';
import { configManager } from '../config/config.js';
import { ErrorHandler, LifeUpError } from '../error/error-handler.js';
import {
  EditTaskSchema,
  AddShopItemSchema,
  EditShopItemSchema,
  ApplyPenaltySchema,
  EditSkillSchema,
  type EditTaskInput,
  type AddShopItemInput,
  type EditShopItemInput,
  type ApplyPenaltyInput,
  type EditSkillInput,
} from '../config/validation.js';
import { ZodError } from 'zod';

export class MutationTools {
  /**
   * Edit an existing task
   */
  static async editTask(input: unknown): Promise<string> {
    try {
      const validated = EditTaskSchema.parse(input);
      configManager.logIfDebug('Editing task:', validated);

      const isHealthy = await lifeupClient.healthCheck();
      if (!isHealthy) {
        throw new LifeUpError(
          'LifeUp server is unreachable',
          'SERVER_UNREACHABLE',
          'The LifeUp server is not responding.',
          true
        );
      }

      const response = await lifeupClient.editTask(validated);

      let result = `✓ Task edited successfully!\n\n`;

      const updates: string[] = [];
      if (validated.id) result += `**Task ID**: ${validated.id}\n`;
      if (validated.gid) result += `**Group ID**: ${validated.gid}\n`;
      if (validated.name) result += `**Search Name**: ${validated.name}\n`;

      if (validated.todo) updates.push('task content');
      if (validated.notes) updates.push('notes');
      if (validated.coin !== undefined) updates.push(`coin reward to ${validated.coin}`);
      if (validated.exp !== undefined) updates.push(`exp reward to ${validated.exp}`);
      if (validated.category !== undefined) updates.push('category');
      if (validated.deadline !== undefined) updates.push('deadline');
      if (validated.skills) updates.push('skill rewards');
      if (validated.items) updates.push('item rewards');

      if (updates.length > 0) {
        result += `\n**Updated**: ${updates.join(', ')}\n`;
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

      return `❌ Unexpected error editing task: ${(error as Error).message}`;
    }
  }

  /**
   * Add a new shop item
   */
  static async addShopItem(input: unknown): Promise<string> {
    try {
      const validated = AddShopItemSchema.parse(input);
      configManager.logIfDebug('Adding shop item:', validated);

      const isHealthy = await lifeupClient.healthCheck();
      if (!isHealthy) {
        throw new LifeUpError(
          'LifeUp server is unreachable',
          'SERVER_UNREACHABLE',
          'The LifeUp server is not responding.',
          true
        );
      }

      const response = await lifeupClient.addShopItem(validated);

      let result = `✓ Shop item created successfully!\n\n`;
      result += `**Name**: ${validated.name}\n`;
      if (validated.desc) result += `**Description**: ${validated.desc}\n`;
      if (validated.price !== undefined) result += `**Price**: ${validated.price} coins\n`;
      if (validated.stock_number !== undefined) {
        result += `**Stock**: ${validated.stock_number === -1 ? 'Unlimited' : validated.stock_number}\n`;
      }
      if (validated.category !== undefined) result += `**Category ID**: ${validated.category}\n`;

      if (response.data?.item_id) {
        result += `**Item ID**: ${response.data.item_id}\n`;
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

      return `❌ Unexpected error adding shop item: ${(error as Error).message}`;
    }
  }

  /**
   * Edit an existing shop item
   */
  static async editShopItem(input: unknown): Promise<string> {
    try {
      const validated = EditShopItemSchema.parse(input);
      configManager.logIfDebug('Editing shop item:', validated);

      const isHealthy = await lifeupClient.healthCheck();
      if (!isHealthy) {
        throw new LifeUpError(
          'LifeUp server is unreachable',
          'SERVER_UNREACHABLE',
          'The LifeUp server is not responding.',
          true
        );
      }

      const response = await lifeupClient.editShopItem(validated);

      let result = `✓ Shop item edited successfully!\n\n`;
      if (validated.id) result += `**Item ID**: ${validated.id}\n`;
      if (validated.name) result += `**Search Name**: ${validated.name}\n`;

      const updates: string[] = [];
      if (validated.set_name) updates.push(`name to "${validated.set_name}"`);
      if (validated.set_desc !== undefined) updates.push('description');
      if (validated.set_price !== undefined) updates.push(`price (${validated.set_price_type || 'absolute'})`);
      if (validated.stock_number !== undefined) updates.push(`stock (${validated.stock_number_type || 'absolute'})`);
      if (validated.own_number !== undefined) updates.push(`owned quantity (${validated.own_number_type || 'absolute'})`);
      if (validated.effects) updates.push('item effects');
      if (validated.disable_purchase !== undefined) updates.push('purchase status');

      if (updates.length > 0) {
        result += `\n**Updated**: ${updates.join(', ')}\n`;
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

      return `❌ Unexpected error editing shop item: ${(error as Error).message}`;
    }
  }

  /**
   * Apply a penalty
   */
  static async applyPenalty(input: unknown): Promise<string> {
    try {
      const validated = ApplyPenaltySchema.parse(input);
      configManager.logIfDebug('Applying penalty:', validated);

      const isHealthy = await lifeupClient.healthCheck();
      if (!isHealthy) {
        throw new LifeUpError(
          'LifeUp server is unreachable',
          'SERVER_UNREACHABLE',
          'The LifeUp server is not responding.',
          true
        );
      }

      const response = await lifeupClient.applyPenalty(validated);

      let result = `✓ Penalty applied successfully!\n\n`;
      result += `**Type**: ${validated.type}\n`;
      result += `**Amount**: ${validated.number}\n`;
      result += `**Reason**: ${validated.content}\n`;

      if (validated.type === 'exp' && validated.skills) {
        result += `**Skills Affected**: ${validated.skills.join(', ')}\n`;
      }

      if (validated.type === 'item') {
        if (validated.item_id) result += `**Item ID**: ${validated.item_id}\n`;
        if (validated.item_name) result += `**Item Name**: ${validated.item_name}\n`;
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

      return `❌ Unexpected error applying penalty: ${(error as Error).message}`;
    }
  }

  /**
   * Edit a skill (create/update/delete)
   */
  static async editSkill(input: unknown): Promise<string> {
    try {
      const validated = EditSkillSchema.parse(input);
      configManager.logIfDebug('Editing skill:', validated);

      const isHealthy = await lifeupClient.healthCheck();
      if (!isHealthy) {
        throw new LifeUpError(
          'LifeUp server is unreachable',
          'SERVER_UNREACHABLE',
          'The LifeUp server is not responding.',
          true
        );
      }

      const response = await lifeupClient.editSkill(validated);

      // Check if deleting
      if (validated.delete) {
        return (
          `✓ Skill deleted successfully!\n\n` +
          `**Skill ID**: ${validated.id}\n\n` +
          `⚠️  This action is permanent and cannot be undone.`
        );
      }

      // Creating or updating
      let result = validated.id
        ? `✓ Skill updated successfully!\n\n`
        : `✓ Skill created successfully!\n\n`;

      if (validated.id) result += `**Skill ID**: ${validated.id}\n`;
      if (validated.content) result += `**Name**: ${validated.content}\n`;
      if (validated.desc) result += `**Description**: ${validated.desc}\n`;
      if (validated.exp !== undefined) result += `**Experience**: ${validated.exp}\n`;
      if (validated.icon) result += `**Icon**: ${validated.icon}\n`;

      if (response.data?.id && !validated.id) {
        result += `**New Skill ID**: ${response.data.id}\n`;
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

      return `❌ Unexpected error editing skill: ${(error as Error).message}`;
    }
  }
}
