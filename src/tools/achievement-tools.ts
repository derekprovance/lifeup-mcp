/**
 * Achievement querying and matching tools for MCP
 */

import { lifeupClient } from '../client/lifeup-client.js';
import { configManager } from '../config/config.js';
import { ErrorHandler, LifeUpError } from '../error/error-handler.js';
import { AchievementMatchSchema, type AchievementMatchInput } from '../config/validation.js';
import * as Types from '../client/types.js';
import { ZodError } from 'zod';

export class AchievementTools {
  /**
   * List all available achievements or achievement categories
   */
  static async listAchievements(): Promise<string> {
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

      // Try to get full achievements first
      const achievements = await lifeupClient.getAchievements();

      if (achievements && achievements.length > 0) {
        return this.formatAchievementsList(achievements);
      }

      // Fallback to categories if full list unavailable
      const categories = await lifeupClient.getAchievementCategories();

      if (categories.length === 0) {
        return (
          'Achievement data is currently unavailable. ' +
          'This may indicate the feature is not available in your LifeUp version.'
        );
      }

      let result = `## Achievement Categories\n\n`;
      result += '(Full achievement data not available; showing categories)\n\n';
      categories.forEach((category) => {
        result += `- **${category.name}** (ID: ${category.id})\n`;
        if (category.desc) result += `  ${category.desc}\n`;
      });

      return result;
    } catch (error) {
      if (error instanceof LifeUpError) {
        return `❌ Error: ${ErrorHandler.formatErrorForClaude(error)}`;
      }
      return `❌ Error fetching achievements: ${(error as Error).message}`;
    }
  }

  /**
   * Match a task to relevant achievements
   * Uses keyword matching and category cross-reference
   */
  static async matchTaskToAchievements(input: unknown): Promise<string> {
    try {
      const validated = AchievementMatchSchema.parse(input);
      configManager.logIfDebug('Matching task to achievements:', validated);

      const isHealthy = await lifeupClient.healthCheck();
      if (!isHealthy) {
        throw new LifeUpError(
          'LifeUp server is unreachable',
          'SERVER_UNREACHABLE',
          'The LifeUp server is not responding.',
          true
        );
      }

      // Try to get achievements
      let achievements = await lifeupClient.getAchievements();

      // If not available, get categories and use those instead
      if (!achievements) {
        const categories = await lifeupClient.getAchievementCategories();
        achievements = categories as any;
      }

      if (!achievements || achievements.length === 0) {
        return (
          'Achievement data is not available. ' +
          'Cannot match tasks to achievements at this time.'
        );
      }

      const matches = this.findMatches(validated.taskName, achievements, validated.categoryId);

      if (matches.length === 0) {
        return (
          `No relevant achievements found for task: "${validated.taskName}"\n\n` +
          `This task might still be valuable! Consider how completing it will help you grow.`
        );
      }

      let result = `## Relevant Achievements\n\n`;
      result += `Based on task: **${validated.taskName}**\n\n`;

      matches.forEach((match, index) => {
        result += `### ${index + 1}. ${match.achievement.name}\n`;
        if (match.achievement.desc) {
          result += `${match.achievement.desc}\n`;
        }
        result += `**Match Confidence**: ${match.confidence}%\n`;
        if (match.matchReasons.length > 0) {
          result += `**Why**: ${match.matchReasons.join('; ')}\n`;
        }
        result += `\n`;
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

      return `❌ Error matching achievements: ${(error as Error).message}`;
    }
  }

  /**
   * Find matching achievements for a task
   * Returns top 5 matches sorted by confidence
   */
  private static findMatches(
    taskName: string,
    achievements: any[],
    categoryId?: number
  ): Types.TaskMatchResult[] {
    const matches: Types.TaskMatchResult[] = [];

    // Extract keywords from task name
    const taskKeywords = this.extractKeywords(taskName);
    configManager.logIfDebug('Task keywords:', taskKeywords);

    achievements.forEach((achievement) => {
      let confidence = 0;
      const matchReasons: string[] = [];

      const achievementText = `${achievement.name} ${achievement.description || achievement.desc || ''}`.toLowerCase();
      const achievementKeywords = this.extractKeywords(achievement.name);

      // Direct keyword matches
      taskKeywords.forEach((keyword) => {
        if (achievementText.includes(keyword)) {
          confidence += 20;
          matchReasons.push(`Contains "${keyword}"`);
        }
      });

      // Keyword overlap
      const overlappingKeywords = taskKeywords.filter((k) =>
        achievementKeywords.some((ak) => ak.includes(k) || k.includes(ak))
      );
      if (overlappingKeywords.length > 0) {
        confidence += 15;
      }

      // Category match
      if (categoryId && achievement.category_id === categoryId) {
        confidence += 10;
        matchReasons.push('Same category');
      }

      if (confidence > 0) {
        matches.push({
          achievement,
          confidence: Math.min(100, confidence),
          matchReasons: matchReasons.slice(0, 3), // Limit to 3 reasons
        });
      }
    });

    // Sort by confidence and return top 5
    return matches.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }

  /**
   * Extract keywords from text
   * Removes common words and splits into meaningful terms
   */
  private static extractKeywords(text: string): string[] {
    const commonWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'from',
      'is',
      'are',
      'was',
      'were',
      'be',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'must',
      'can',
      'my',
      'your',
      'his',
      'her',
      'its',
      'our',
      'their',
      'this',
      'that',
      'these',
      'those',
      'i',
      'you',
      'he',
      'she',
      'it',
      'we',
      'they',
      'new',
      'old',
      'good',
      'bad',
      'task',
      'complete',
      'finish',
    ]);

    return (
      text
        .toLowerCase()
        .split(/[\s\-_]+/)
        .filter((word) => word.length > 2 && !commonWords.has(word))
        .slice(0, 5) // Limit to 5 keywords
    );
  }

  /**
   * Format achievements list for display
   */
  private static formatAchievementsList(achievements: Types.Achievement[]): string {
    if (achievements.length === 0) {
      return 'No achievements found.';
    }

    const unlocked = achievements.filter((a) => a.is_unlocked);
    const locked = achievements.filter((a) => !a.is_unlocked);

    let result = `## Achievements\n\n`;
    result += `**Unlocked**: ${unlocked.length} | **Locked**: ${locked.length}\n\n`;

    if (unlocked.length > 0) {
      result += `### Unlocked Achievements\n`;
      unlocked.slice(0, 10).forEach((achievement) => {
        result += `✓ **${achievement.name}**\n`;
        if (achievement.description) {
          result += `  ${achievement.description}\n`;
        }
      });
      if (unlocked.length > 10) {
        result += `... and ${unlocked.length - 10} more unlocked\n`;
      }
    }

    if (locked.length > 0) {
      result += `\n### Locked Achievements\n`;
      locked.slice(0, 10).forEach((achievement) => {
        const progress = achievement.progress || 0;
        const target = achievement.target || 1;
        const progressPercent = Math.round((progress / target) * 100);
        result += `○ **${achievement.name}** (${progressPercent}% progress)\n`;
        if (achievement.description) {
          result += `  ${achievement.description}\n`;
        }
      });
      if (locked.length > 10) {
        result += `... and ${locked.length - 10} more locked\n`;
      }
    }

    return result;
  }
}
