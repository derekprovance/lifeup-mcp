/**
 * Pure functions for achievement matching algorithm
 * These functions have no external dependencies and can be easily tested
 */

import * as Types from '../client/types.js';

const COMMON_WORDS = new Set([
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

/**
 * Extract meaningful keywords from text
 * Removes common words, filters short words, limits to 5 keywords
 *
 * @param text - Text to extract keywords from
 * @returns Array of keywords
 */
export function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s\-_]+/)
    .filter((word) => word.length > 2 && !COMMON_WORDS.has(word))
    .slice(0, 5);
}

/**
 * Find matching achievements for a task based on keyword matching
 * Returns top 5 matches sorted by confidence score
 *
 * @param taskName - Task name to match against achievements
 * @param achievements - Array of achievements to search
 * @param categoryId - Optional category ID for additional matching boost
 * @returns Array of top 5 matching achievements with confidence scores
 */
export function findMatches(
  taskName: string,
  achievements: any[],
  categoryId?: number
): Types.TaskMatchResult[] {
  const matches: Types.TaskMatchResult[] = [];

  // Extract keywords from task name
  const taskKeywords = extractKeywords(taskName);

  achievements.forEach((achievement) => {
    let confidence = 0;
    const matchReasons: string[] = [];

    const achievementText =
      `${achievement.name} ${achievement.description || achievement.desc || ''}`.toLowerCase();
    const achievementKeywords = extractKeywords(achievement.name);

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

  // Sort by confidence (descending) and return top 5
  return matches.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}
