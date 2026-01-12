/**
 * Unit tests for URL building methods in LifeUpClient
 * Tests URL encoding, parameter handling, and security validations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LifeUpClient } from '@/client/lifeup-client';
import * as Types from '@/client/types';

describe('LifeUpClient URL Building', () => {
  let client: LifeUpClient;

  beforeEach(() => {
    // Create a client instance for testing
    // We'll use the private methods via type casting for testing
    client = LifeUpClient.create();
  });

  describe('buildTaskUrl', () => {
    it('should create basic task URL with only required name field', () => {
      const request: Types.CreateTaskRequest = {
        name: 'Test Task',
      };
      const url = (client as any).buildTaskUrl(request);
      expect(url).toContain('lifeup://api/add_task');
      expect(url).toContain('todo=Test%20Task');
    });

    it('should encode special characters in task name', () => {
      const request: Types.CreateTaskRequest = {
        name: 'Test & Special #task',
      };
      const url = (client as any).buildTaskUrl(request);
      // Should properly encode & and # characters
      expect(url).toContain('todo=Test');
      expect(url).not.toContain('todo=Test & Special');
    });

    it('should include exp when provided', () => {
      const request: Types.CreateTaskRequest = {
        name: 'Task',
        exp: 100,
      };
      const url = (client as any).buildTaskUrl(request);
      expect(url).toContain('exp=100');
    });

    it('should include skills array when provided', () => {
      const request: Types.CreateTaskRequest = {
        name: 'Task',
        exp: 100,
        skillIds: [1, 2, 3],
      };
      const url = (client as any).buildTaskUrl(request);
      expect(url).toContain('skills=1');
      expect(url).toContain('skills=2');
      expect(url).toContain('skills=3');
    });

    it('should not include undefined optional fields', () => {
      const request: Types.CreateTaskRequest = {
        name: 'Task',
      };
      const url = (client as any).buildTaskUrl(request);
      expect(url).not.toContain('exp=');
      expect(url).not.toContain('coin=');
      expect(url).not.toContain('deadline=');
    });

    it('should handle count task parameters', () => {
      const request: Types.CreateTaskRequest = {
        name: 'Exercise',
        task_type: 1,
        target_times: 5,
      };
      const url = (client as any).buildTaskUrl(request);
      expect(url).toContain('task_type=1');
      expect(url).toContain('target_times=5');
    });

    it('should handle boolean auto_use_item flag', () => {
      const request: Types.CreateTaskRequest = {
        name: 'Task',
        auto_use_item: true,
      };
      const url = (client as any).buildTaskUrl(request);
      expect(url).toContain('auto_use_item=true');
    });

    it('should include frequency parameter when provided', () => {
      const request: Types.CreateTaskRequest = {
        name: 'Daily Task',
        frequency: 1,
      };
      const url = (client as any).buildTaskUrl(request);
      expect(url).toContain('frequency=1');
    });

    it('should handle recurring task with frequency values', () => {
      const testCases = [
        { frequency: 0, expected: 'frequency=0' }, // Once
        { frequency: 1, expected: 'frequency=1' }, // Daily
        { frequency: 7, expected: 'frequency=7' }, // Weekly
        { frequency: -4, expected: 'frequency=-4' }, // Monthly
        { frequency: -5, expected: 'frequency=-5' }, // Yearly
      ];

      testCases.forEach(({ frequency, expected }) => {
        const request: Types.CreateTaskRequest = {
          name: 'Recurring Task',
          frequency,
        };
        const url = (client as any).buildTaskUrl(request);
        expect(url).toContain(expected);
      });
    });

    it('should not include frequency parameter when undefined', () => {
      const request: Types.CreateTaskRequest = {
        name: 'One-time Task',
      };
      const url = (client as any).buildTaskUrl(request);
      expect(url).not.toContain('frequency=');
    });
  });

  describe('buildAchievementUrl', () => {
    it('should create achievement URL for creation', () => {
      const request: Types.CreateAchievementRequest = {
        name: 'Achievement Name',
        category_id: 1,
      };
      const url = (client as any).buildAchievementUrl(request);
      expect(url).toContain('lifeup://api/achievement');
      expect(url).toContain('name=Achievement%20Name');
      expect(url).toContain('category_id=1');
    });

    it('should include edit_id for update operations', () => {
      const request: Types.UpdateAchievementRequest = {
        edit_id: 42,
        name: 'Updated Name',
      };
      const url = (client as any).buildAchievementUrl(request);
      expect(url).toContain('edit_id=42');
      expect(url).toContain('name=Updated%20Name');
    });

    it('should include coin and exp rewards', () => {
      const request: Types.CreateAchievementRequest = {
        name: 'Rewarding Achievement',
        category_id: 1,
        coin: 500,
        exp: 100,
      };
      const url = (client as any).buildAchievementUrl(request);
      expect(url).toContain('coin=500');
      expect(url).toContain('exp=100');
    });

    it('should include skills array for reward', () => {
      const request: Types.CreateAchievementRequest = {
        name: 'Achievement',
        category_id: 1,
        skills: [1, 2],
      };
      const url = (client as any).buildAchievementUrl(request);
      expect(url).toContain('skills=1');
      expect(url).toContain('skills=2');
    });

    it('should handle boolean unlocked flag', () => {
      const request: Types.CreateAchievementRequest = {
        name: 'Achievement',
        category_id: 1,
        unlocked: false,
      };
      const url = (client as any).buildAchievementUrl(request);
      expect(url).toContain('unlocked=false');
    });

    it('should encode description properly', () => {
      const request: Types.CreateAchievementRequest = {
        name: 'Achievement',
        category_id: 1,
        desc: 'Description with special chars & symbols',
      };
      const url = (client as any).buildAchievementUrl(request);
      expect(url).toContain('desc=');
      expect(url).not.toContain('Description with special chars & symbols');
    });
  });

  describe('buildTaskDeleteUrl', () => {
    it('should create delete URL with task ID', () => {
      const request: Types.DeleteTaskRequest = {
        id: 123,
      };
      const url = (client as any).buildTaskDeleteUrl(request);
      expect(url).toContain('lifeup://api/delete_task');
      expect(url).toContain('id=123');
    });
  });

  describe('buildAchievementDeleteUrl', () => {
    it('should create achievement delete URL', () => {
      const request: Types.DeleteAchievementRequest = {
        edit_id: 42,
      };
      const url = (client as any).buildAchievementDeleteUrl(request);
      expect(url).toContain('lifeup://api/achievement');
      expect(url).toContain('edit_id=42');
      expect(url).toContain('delete=true');
    });
  });

  describe('buildAddShopItemUrl', () => {
    it('should create shop item with required name', () => {
      const request: Types.AddShopItemRequest = {
        name: 'Potion',
      };
      const url = (client as any).buildAddShopItemUrl(request);
      expect(url).toContain('lifeup://api/item');
      expect(url).toContain('name=Potion');
    });

    it('should include price and stock', () => {
      const request: Types.AddShopItemRequest = {
        name: 'Potion',
        price: 100,
        stock_number: 10,
      };
      const url = (client as any).buildAddShopItemUrl(request);
      expect(url).toContain('price=100');
      expect(url).toContain('stock_number=10');
    });

    it('should encode description safely', () => {
      const request: Types.AddShopItemRequest = {
        name: 'Item',
        desc: 'Description & special chars',
      };
      const url = (client as any).buildAddShopItemUrl(request);
      expect(url).toContain('desc=');
      expect(url).not.toContain('Description & special chars');
    });

    it('should handle disable_purchase flag', () => {
      const request: Types.AddShopItemRequest = {
        name: 'Limited Item',
        disable_purchase: true,
      };
      const url = (client as any).buildAddShopItemUrl(request);
      expect(url).toContain('disable_purchase=true');
    });
  });

  describe('buildEditShopItemUrl', () => {
    it('should create edit URL with item ID', () => {
      const request: Types.EditShopItemRequest = {
        id: 5,
        set_name: 'New Name',
      };
      const url = (client as any).buildEditShopItemUrl(request);
      expect(url).toContain('lifeup://api/item');
      expect(url).toContain('id=5');
      expect(url).toContain('set_name=New%20Name');
    });

    it('should handle absolute and relative price adjustments', () => {
      const request: Types.EditShopItemRequest = {
        id: 5,
        set_price: 150,
        set_price_type: 'absolute',
      };
      const url = (client as any).buildEditShopItemUrl(request);
      expect(url).toContain('set_price=150');
      expect(url).toContain('set_price_type=absolute');
    });
  });

  describe('buildPenaltyUrl', () => {
    it('should create penalty URL for coin penalty', () => {
      const request: Types.ApplyPenaltyRequest = {
        type: 'coin',
        content: 'Lost coins',
        number: 100,
      };
      const url = (client as any).buildPenaltyUrl(request);
      expect(url).toContain('lifeup://api/penalty');
      expect(url).toContain('type=coin');
      expect(url).toContain('content=Lost%20coins');
      expect(url).toContain('number=100');
    });

    it('should include skills array for experience penalty', () => {
      const request: Types.ApplyPenaltyRequest = {
        type: 'exp',
        content: 'Lost experience',
        number: 50,
        skills: [1, 2],
      };
      const url = (client as any).buildPenaltyUrl(request);
      expect(url).toContain('type=exp');
      expect(url).toContain('skills=1');
      expect(url).toContain('skills=2');
    });

    it('should encode penalty reason safely', () => {
      const request: Types.ApplyPenaltyRequest = {
        type: 'coin',
        content: 'Penalty & consequence',
        number: 50,
      };
      const url = (client as any).buildPenaltyUrl(request);
      expect(url).toContain('content=');
      expect(url).not.toContain('Penalty & consequence');
    });
  });

  describe('buildEditSkillUrl', () => {
    it('should create skill edit URL', () => {
      const request: Types.EditSkillRequest = {
        content: 'Strength',
      };
      const url = (client as any).buildEditSkillUrl(request);
      expect(url).toContain('lifeup://api/skill');
      expect(url).toContain('content=Strength');
    });

    it('should handle skill experience updates', () => {
      const request: Types.EditSkillRequest = {
        id: 1,
        exp: 500,
      };
      const url = (client as any).buildEditSkillUrl(request);
      expect(url).toContain('id=1');
      expect(url).toContain('exp=500');
    });

    it('should encode skill description safely', () => {
      const request: Types.EditSkillRequest = {
        content: 'Skill',
        desc: 'Description & notes',
      };
      const url = (client as any).buildEditSkillUrl(request);
      expect(url).toContain('desc=');
      expect(url).not.toContain('Description & notes');
    });

    it('should handle delete flag', () => {
      const request: Types.EditSkillRequest = {
        id: 1,
        delete: true,
      };
      const url = (client as any).buildEditSkillUrl(request);
      expect(url).toContain('delete=true');
    });
  });

  describe('validateStringInput security', () => {
    it('should handle strings with common punctuation', () => {
      const request: Types.CreateTaskRequest = {
        name: 'Task with period. And comma, and colon:',
      };
      // Should not throw
      expect(() => {
        (client as any).buildTaskUrl(request);
      }).not.toThrow();
    });

    it('should handle URLs safely without encoding issues', () => {
      const request: Types.CreateTaskRequest = {
        name: 'Visit example.com',
      };
      const url = (client as any).buildTaskUrl(request);
      expect(url).toContain('todo=Visit%20example.com');
    });

    it('should handle quoted strings', () => {
      const request: Types.CreateTaskRequest = {
        name: 'Task "with quotes"',
      };
      const url = (client as any).buildTaskUrl(request);
      expect(url).toContain('todo=');
      // Quotes should be encoded
      expect(url).not.toContain('todo=Task "with quotes"');
    });

    it('should preserve unicode characters', () => {
      const request: Types.CreateTaskRequest = {
        name: 'Task with émojis 🎯',
      };
      const url = (client as any).buildTaskUrl(request);
      expect(url).toContain('todo=');
    });
  });

  describe('URL encoding consistency', () => {
    it('should use same space encoding across all URL methods', () => {
      const taskUrl = (client as any).buildTaskUrl({
        name: 'Two Word',
      });
      const achievementUrl = (client as any).buildAchievementUrl({
        name: 'Two Word',
        category_id: 1,
      });
      const shopUrl = (client as any).buildAddShopItemUrl({
        name: 'Two Word',
      });

      // All should use %20 for spaces, not +
      expect(taskUrl).toContain('%20');
      expect(achievementUrl).toContain('%20');
      expect(shopUrl).toContain('%20');
    });

    it('should properly format URLs without duplicate parameters', () => {
      const request: Types.CreateTaskRequest = {
        name: 'Task',
        skillIds: [1, 2, 3],
        exp: 100,
      };
      const url = (client as any).buildTaskUrl(request);

      // Count occurrences of 'skills=' - should be exactly 3
      const skillMatches = url.match(/skills=/g);
      expect(skillMatches?.length).toBe(3);
    });
  });
});
