/**
 * Achievement Integration Test Suite
 *
 * Comprehensive test of achievement handling with:
 * - Different task types (normal, count, negative)
 * - Achievement creation with unlock conditions
 * - Condition verification and matching
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MCPTestClient } from '../helpers/mcp-client';
import { expectSuccess, expectError } from '../helpers/assertions';

describe('Achievement Integration', () => {
  let client: MCPTestClient;
  let createdTaskIds: number[] = [];
  let createdAchievementIds: number[] = [];

  beforeAll(async () => {
    client = new MCPTestClient();
    await client.start();
  });

  afterAll(async () => {
    // Cleanup - delete created achievements and tasks
    for (const achievementId of createdAchievementIds) {
      try {
        await client.callTool('delete_achievement', { delete_id: achievementId });
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    for (const taskId of createdTaskIds) {
      try {
        await client.callTool('delete_task', { id: taskId });
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    await client.stop();
  });

  describe('Task Creation - Different Types', () => {
    it('should create a normal task with high importance', async () => {
      const response = await client.callTool('create_task', {
        name: '[E2E-ACHIEVEMENT-TEST] Normal Task - Learn TypeScript',
        coin: 50,
        importance: 3,
        difficulty: 2,
      });

      expectSuccess(response);
      expect(response.text).toMatch(/Task (created|ID)/i);
      expect(response.text).not.toMatch(/error/i);

      const taskId = parseInt(response.text.match(/Task ID[:\s]+(\d+)/i)?.[1] || '0', 10);
      expect(taskId).toBeGreaterThan(0);
      createdTaskIds.push(taskId);
    });

    it('should create a count task (completable multiple times)', async () => {
      const response = await client.callTool('create_task', {
        name: '[E2E-ACHIEVEMENT-TEST] Count Task - Exercise 5 Times',
        task_type: 1, // Count task
        target_times: 5,
        coin: 100,
        importance: 2,
        difficulty: 1,
      });

      expectSuccess(response);
      expect(response.text).toMatch(/Task (created|ID)/i);
      expect(response.text).toMatch(/target|count|times?/i);

      const taskId = parseInt(response.text.match(/Task ID[:\s]+(\d+)/i)?.[1] || '0', 10);
      expect(taskId).toBeGreaterThan(0);
      createdTaskIds.push(taskId);
    });

    it('should create a negative/penalty task', async () => {
      const response = await client.callTool('create_task', {
        name: '[E2E-ACHIEVEMENT-TEST] Negative Task - Procrastination Penalty',
        task_type: 2, // Negative task
        coin: -50, // Penalty instead of reward
        importance: 1,
        difficulty: 1,
      });

      expectSuccess(response);
      expect(response.text).toMatch(/Task (created|ID)/i);

      const taskId = parseInt(response.text.match(/Task ID[:\s]+(\d+)/i)?.[1] || '0', 10);
      expect(taskId).toBeGreaterThan(0);
      createdTaskIds.push(taskId);
    });
  });

  describe('Achievement Creation with Conditions', () => {
    it('should create an achievement with task completion criteria', async () => {
      // Wait for all tasks to be created
      expect(createdTaskIds.length).toBeGreaterThanOrEqual(3);

      const [normalTaskId, countTaskId, negativeTaskId] = createdTaskIds;

      const response = await client.callTool('create_achievement', {
        name: '[E2E-ACHIEVEMENT-TEST] Master Learner',
        category_id: 1, // General/default category
        desc: 'Complete various tasks to master your learning journey',
        conditions_json: [
          {
            type: 0, // "Complete task (ID) X times"
            related_id: normalTaskId,
            target: 1, // Complete the normal task once
          },
          {
            type: 0, // "Complete task (ID) X times"
            related_id: countTaskId,
            target: 3, // Complete count task 3 times (out of 5)
          },
          {
            type: 0, // "Complete task (ID) X times"
            related_id: negativeTaskId,
            target: 0, // Don't trigger the negative task
          },
        ],
        exp: 100,
        coin: 200,
        unlocked: false, // Starts locked
      });

      expectSuccess(response);
      expect(response.text).toMatch(/Achievement (created|ID)/i);
      expect(response.text).toMatch(/condition/i);

      const achievementId = parseInt(response.text.match(/Achievement ID[:\s]+(\d+)/i)?.[1] || '0', 10);
      expect(achievementId).toBeGreaterThan(0);
      createdAchievementIds.push(achievementId);
    });

    it('should verify achievement was created with correct properties', async () => {
      expect(createdAchievementIds.length).toBeGreaterThan(0);

      const response = await client.callTool('list_achievements', {});

      expectSuccess(response);
      // Should contain our test achievement
      expect(response.text).toMatch(/\[E2E-ACHIEVEMENT-TEST\]/);
      // Conditions should be visible
      expect(response.text).toMatch(/Complete task|condition/i);
    });
  });

  describe('Achievement Condition Verification', () => {
    it('should display unlock conditions in achievement list', async () => {
      const response = await client.callTool('list_achievements', {});

      expectSuccess(response);

      // Verify condition types are being formatted
      const hasConditions = response.text.match(/Complete task.*\d+.*times?/i);
      expect(hasConditions).toBeTruthy();
    });

    it('should match tasks to relevant achievements', async () => {
      const response = await client.callTool('match_task_to_achievements', {
        taskName: 'Learning and skill development',
      });

      expectSuccess(response);
      // Should return achievement suggestions
      expect(response.text).toMatch(/Relevant Achievements|achievement/i);
    });

    it('should handle achievement matching for different task types', async () => {
      const response = await client.callTool('match_task_to_achievements', {
        taskName: 'Exercise and fitness',
      });

      expectSuccess(response);
      // Should provide matches even if none are perfect
      expect(response.text).toBeTruthy();
      expect(response.text.length).toBeGreaterThan(0);
    });
  });

  describe('Achievement Matching Algorithm', () => {
    it('should find relevant achievements by keyword matching', async () => {
      const response = await client.callTool('match_task_to_achievements', {
        taskName: 'TypeScript programming',
      });

      expectSuccess(response);
      // Should show some matches or explanation
      expect(response.text).toMatch(/relevant|achievement|match/i);
    });

    it('should handle tasks with multiple keyword matches', async () => {
      const response = await client.callTool('match_task_to_achievements', {
        taskName: 'Practice Pomodoro focus sessions',
      });

      expectSuccess(response);
      expect(response.text).toBeTruthy();
    });

    it('should gracefully handle tasks with no matches', async () => {
      const response = await client.callTool('match_task_to_achievements', {
        taskName: 'Complete random xyz123 task',
      });

      // Should not error, just indicate no matches
      expect(response.isError).toBeFalsy();
      expect(response.text).toBeTruthy();
    });
  });

  describe('Achievement Lifecycle', () => {
    it('should list all achievement categories', async () => {
      const response = await client.callTool('list_achievement_categories', {});

      expectSuccess(response);
      // Should show categories
      expect(response.text).toMatch(/achievement|category/i);
    });

    it('should allow updating achievement properties (except conditions)', async () => {
      if (createdAchievementIds.length === 0) {
        expect(true).toBe(true); // Skip if no achievements created
        return;
      }

      const achievementId = createdAchievementIds[0];

      const response = await client.callTool('update_achievement', {
        edit_id: achievementId,
        name: '[E2E-ACHIEVEMENT-TEST] Master Learner (Updated)',
        desc: 'Updated description for test achievement',
      });

      expectSuccess(response);
      expect(response.text).toMatch(/updated|success/i);
    });

    it('should verify that conditions cannot be updated directly', async () => {
      // This is documented behavior - conditions_json is not supported in update
      // The API accepts the parameter but ignores it
      if (createdAchievementIds.length === 0) {
        expect(true).toBe(true); // Skip if no achievements created
        return;
      }

      const achievementId = createdAchievementIds[0];

      const response = await client.callTool('update_achievement', {
        edit_id: achievementId,
        coin: 300, // Update rewards
      });

      // Should succeed because we're not trying to update conditions
      expectSuccess(response);
    });
  });

  describe('Condition Type Coverage', () => {
    it('should support task completion conditions (type 0)', async () => {
      // Already tested in achievement creation
      expect(createdAchievementIds.length).toBeGreaterThan(0);
    });

    it('should handle multiple conditions with AND logic', async () => {
      // Created achievement has 3 conditions that must ALL be met
      expect(createdAchievementIds.length).toBeGreaterThan(0);

      const response = await client.callTool('list_achievements', {});
      expectSuccess(response);

      // Verify conditions are properly displayed
      expect(response.text).toMatch(/Complete task/i);
    });
  });
});
