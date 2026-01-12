/**
 * Comprehensive tests for all Zod validation schemas
 * Tests valid inputs, invalid inputs, edge cases, and optional field handling
 */

import { describe, it, expect } from 'vitest';
import {
  CreateTaskSchema,
  SearchTasksSchema,
  TaskHistorySchema,
  AchievementMatchSchema,
  SearchShopItemsSchema,
  AchievementConditionSchema,
  ItemRewardSchema,
  CreateAchievementSchema,
  UpdateAchievementSchema,
  DeleteAchievementSchema,
  EditTaskSchema,
  ItemEffectSchema,
  PurchaseLimitSchema,
  AddShopItemSchema,
  EditShopItemSchema,
  ApplyPenaltySchema,
  EditSkillSchema,
  SubtaskDefinitionSchema,
  CreateSubtaskSchema,
  EditSubtaskSchema,
} from '@/config/validation';

// ============================================================================
// CreateTaskSchema Tests
// ============================================================================

describe('CreateTaskSchema', () => {
  describe('valid inputs', () => {
    it('accepts minimal task with just name', () => {
      const result = CreateTaskSchema.parse({ name: 'Test Task' });
      expect(result.name).toBe('Test Task');
      expect(result.exp).toBeUndefined();
    });

    it('accepts task with all optional fields', () => {
      const input = {
        name: 'Full Task',
        exp: 100,
        coin: 50,
        coinVar: 10,
        categoryId: 1,
        deadline: Date.now() + 86400000,
        skillIds: [1, 2, 3],
        content: 'Task description',
      };
      const result = CreateTaskSchema.parse(input);
      expect(result).toMatchObject(input);
    });

    it('accepts task with single skill', () => {
      const result = CreateTaskSchema.parse({ name: 'Task', skillIds: [1] });
      expect(result.skillIds).toEqual([1]);
    });

    it('accepts task with exactly 20 skills', () => {
      const skills = Array.from({ length: 20 }, (_, i) => i + 1);
      const result = CreateTaskSchema.parse({ name: 'Task', skillIds: skills });
      expect(result.skillIds).toHaveLength(20);
    });
  });

  describe('invalid inputs', () => {
    it('rejects empty name', () => {
      expect(() => CreateTaskSchema.parse({ name: '' }))
        .toThrow('Task name cannot be empty');
    });

    it('rejects name longer than 200 characters', () => {
      const longName = 'x'.repeat(201);
      expect(() => CreateTaskSchema.parse({ name: longName }))
        .toThrow('Task name cannot exceed 200 characters');
    });

    it('rejects negative exp', () => {
      expect(() => CreateTaskSchema.parse({ name: 'Task', exp: -10 }))
        .toThrow('Experience points must be non-negative');
    });

    it('rejects negative coin', () => {
      expect(() => CreateTaskSchema.parse({ name: 'Task', coin: -5 }))
        .toThrow('Coin reward must be non-negative');
    });

    it('rejects negative coinVar', () => {
      expect(() => CreateTaskSchema.parse({ name: 'Task', coinVar: -3 }))
        .toThrow('Coin variance must be non-negative');
    });

    it('rejects negative categoryId', () => {
      expect(() => CreateTaskSchema.parse({ name: 'Task', categoryId: -1 }))
        .toThrow('Category ID must be non-negative');
    });

    it('rejects non-positive deadline', () => {
      expect(() => CreateTaskSchema.parse({ name: 'Task', deadline: 0 }))
        .toThrow('Deadline must be a valid timestamp');
    });

    it('rejects more than 20 skills', () => {
      const tooManySkills = Array.from({ length: 21 }, (_, i) => i + 1);
      expect(() => CreateTaskSchema.parse({ name: 'Task', skillIds: tooManySkills }))
        .toThrow('Cannot specify more than 20 skills');
    });

    it('rejects skill ID that is not positive', () => {
      expect(() => CreateTaskSchema.parse({ name: 'Task', skillIds: [0] }))
        .toThrow('Skill IDs must be positive');
    });

    it('rejects content longer than 1000 characters', () => {
      const longContent = 'x'.repeat(1001);
      expect(() => CreateTaskSchema.parse({ name: 'Task', content: longContent }))
        .toThrow('Task content cannot exceed 1000 characters');
    });
  });

  describe('edge cases', () => {
    it('accepts exactly 200 character name', () => {
      const maxName = 'x'.repeat(200);
      const result = CreateTaskSchema.parse({ name: maxName });
      expect(result.name).toBe(maxName);
    });

    it('accepts zero exp', () => {
      const result = CreateTaskSchema.parse({ name: 'Task', exp: 0, skillIds: [1] });
      expect(result.exp).toBe(0);
    });

    it('accepts exactly 1000 character content', () => {
      const maxContent = 'x'.repeat(1000);
      const result = CreateTaskSchema.parse({ name: 'Task', content: maxContent });
      expect(result.content).toBe(maxContent);
    });
  });

  describe('exp and skillIds relationship validation', () => {
    it('rejects exp without skillIds', () => {
      expect(() => CreateTaskSchema.parse({ name: 'Task', exp: 100 }))
        .toThrow('When exp is specified, skillIds must be provided as a non-empty array');
    });

    it('rejects exp with empty skillIds array', () => {
      expect(() => CreateTaskSchema.parse({ name: 'Task', exp: 100, skillIds: [] }))
        .toThrow('When exp is specified, skillIds must be provided as a non-empty array');
    });

    it('accepts exp with non-empty skillIds', () => {
      const result = CreateTaskSchema.parse({ name: 'Task', exp: 100, skillIds: [1] });
      expect(result.exp).toBe(100);
      expect(result.skillIds).toEqual([1]);
    });

    it('accepts skillIds without exp (one-way validation)', () => {
      const result = CreateTaskSchema.parse({ name: 'Task', skillIds: [1, 2] });
      expect(result.skillIds).toEqual([1, 2]);
      expect(result.exp).toBeUndefined();
    });

    it('accepts exp of 0 with skillIds (edge case)', () => {
      const result = CreateTaskSchema.parse({ name: 'Task', exp: 0, skillIds: [1] });
      expect(result.exp).toBe(0);
      expect(result.skillIds).toEqual([1]);
    });
  });

  describe('count task validation (task_type and target_times)', () => {
    it('accepts count task with valid task_type and target_times', () => {
      const result = CreateTaskSchema.parse({
        name: 'Count Task',
        task_type: 1,
        target_times: 5,
      });
      expect(result.task_type).toBe(1);
      expect(result.target_times).toBe(5);
    });

    it('accepts count task with is_affect_shop_reward', () => {
      const result = CreateTaskSchema.parse({
        name: 'Count Task',
        task_type: 1,
        target_times: 3,
        is_affect_shop_reward: true,
      });
      expect(result.is_affect_shop_reward).toBe(true);
    });

    it('rejects count task (task_type=1) without target_times', () => {
      expect(() => CreateTaskSchema.parse({
        name: 'Count Task',
        task_type: 1,
      })).toThrow('When task_type is 1 (count task), target_times must be provided and must be positive');
    });

    it('rejects count task with zero target_times', () => {
      expect(() => CreateTaskSchema.parse({
        name: 'Count Task',
        task_type: 1,
        target_times: 0,
      })).toThrow('Target times must be positive');
    });

    it('rejects count task with negative target_times', () => {
      expect(() => CreateTaskSchema.parse({
        name: 'Count Task',
        task_type: 1,
        target_times: -5,
      })).toThrow('Target times must be positive');
    });

    it('accepts normal task (task_type=0) without target_times', () => {
      const result = CreateTaskSchema.parse({
        name: 'Normal Task',
        task_type: 0,
      });
      expect(result.task_type).toBe(0);
      expect(result.target_times).toBeUndefined();
    });

    it('accepts negative task (task_type=2) without target_times', () => {
      const result = CreateTaskSchema.parse({
        name: 'Negative Task',
        task_type: 2,
      });
      expect(result.task_type).toBe(2);
    });

    it('accepts API task (task_type=3) without target_times', () => {
      const result = CreateTaskSchema.parse({
        name: 'API Task',
        task_type: 3,
      });
      expect(result.task_type).toBe(3);
    });

    it('rejects task_type below 0', () => {
      expect(() => CreateTaskSchema.parse({
        name: 'Task',
        task_type: -1,
      })).toThrow('Task type must be 0-3');
    });

    it('rejects task_type above 3', () => {
      expect(() => CreateTaskSchema.parse({
        name: 'Task',
        task_type: 4,
      })).toThrow('Task type must be 0-3');
    });

    it('accepts task without task_type (defaults to normal)', () => {
      const result = CreateTaskSchema.parse({
        name: 'Task',
      });
      expect(result.task_type).toBeUndefined();
    });

    it('accepts target_times without task_type (validation passes)', () => {
      const result = CreateTaskSchema.parse({
        name: 'Task',
        target_times: 5,
      });
      expect(result.target_times).toBe(5);
    });

    it('accepts is_affect_shop_reward without task_type', () => {
      const result = CreateTaskSchema.parse({
        name: 'Task',
        is_affect_shop_reward: true,
      });
      expect(result.is_affect_shop_reward).toBe(true);
    });
  });
});

// ============================================================================
// SearchTasksSchema Tests
// ============================================================================

describe('SearchTasksSchema', () => {
  describe('valid inputs', () => {
    it('accepts empty object', () => {
      const result = SearchTasksSchema.parse({});
      expect(result.status).toBe('all');
      expect(result.offset).toBeUndefined();
    });

    it('accepts with category ID', () => {
      const result = SearchTasksSchema.parse({ categoryId: 5 });
      expect(result.categoryId).toBe(5);
    });

    it('accepts with search query', () => {
      const result = SearchTasksSchema.parse({ searchQuery: 'test' });
      expect(result.searchQuery).toBe('test');
    });

    it('accepts with status active', () => {
      const result = SearchTasksSchema.parse({ status: 'active' });
      expect(result.status).toBe('active');
    });

    it('accepts with status completed', () => {
      const result = SearchTasksSchema.parse({ status: 'completed' });
      expect(result.status).toBe('completed');
    });

    it('accepts all valid combinations', () => {
      const input = {
        categoryId: 3,
        searchQuery: 'read book',
        status: 'active' as const,
        deadlineBefore: Date.now(),
      };
      const result = SearchTasksSchema.parse(input);
      expect(result).toMatchObject(input);
    });
  });

  describe('invalid inputs', () => {
    it('rejects category ID that is not positive', () => {
      expect(() => SearchTasksSchema.parse({ categoryId: 0 }))
        .toThrow('Category ID must be positive');
    });

    it('rejects search query longer than 200 characters', () => {
      const longQuery = 'x'.repeat(201);
      expect(() => SearchTasksSchema.parse({ searchQuery: longQuery }))
        .toThrow('Search query cannot exceed 200 characters');
    });

    it('rejects invalid status', () => {
      expect(() => SearchTasksSchema.parse({ status: 'invalid' }))
        .toThrow();
    });

    it('rejects non-positive deadlineBefore', () => {
      expect(() => SearchTasksSchema.parse({ deadlineBefore: 0 }))
        .toThrow('Deadline must be a valid timestamp');
    });
  });
});

// ============================================================================
// TaskHistorySchema Tests
// ============================================================================

describe('TaskHistorySchema', () => {
  describe('valid inputs', () => {
    it('accepts empty object with defaults', () => {
      const result = TaskHistorySchema.parse({});
      expect(result.offset).toBe(0);
      expect(result.limit).toBe(100);
    });

    it('accepts with custom offset', () => {
      const result = TaskHistorySchema.parse({ offset: 50 });
      expect(result.offset).toBe(50);
      expect(result.limit).toBe(100);
    });

    it('accepts with custom limit', () => {
      const result = TaskHistorySchema.parse({ limit: 500 });
      expect(result.limit).toBe(500);
    });

    it('accepts with both offset and limit', () => {
      const result = TaskHistorySchema.parse({ offset: 100, limit: 250 });
      expect(result.offset).toBe(100);
      expect(result.limit).toBe(250);
    });
  });

  describe('invalid inputs', () => {
    it('rejects negative offset', () => {
      expect(() => TaskHistorySchema.parse({ offset: -1 }))
        .toThrow('Offset must be non-negative');
    });

    it('rejects non-positive limit', () => {
      expect(() => TaskHistorySchema.parse({ limit: 0 }))
        .toThrow('Limit must be positive');
    });

    it('rejects limit exceeding 1000', () => {
      expect(() => TaskHistorySchema.parse({ limit: 1001 }))
        .toThrow('Limit cannot exceed 1000');
    });
  });

  describe('edge cases', () => {
    it('accepts limit of exactly 1000', () => {
      const result = TaskHistorySchema.parse({ limit: 1000 });
      expect(result.limit).toBe(1000);
    });

    it('accepts offset of 0', () => {
      const result = TaskHistorySchema.parse({ offset: 0 });
      expect(result.offset).toBe(0);
    });
  });
});

// ============================================================================
// AchievementMatchSchema Tests
// ============================================================================

describe('AchievementMatchSchema', () => {
  describe('valid inputs', () => {
    it('accepts task name only', () => {
      const result = AchievementMatchSchema.parse({ taskName: 'Read a book' });
      expect(result.taskName).toBe('Read a book');
    });

    it('accepts with category ID', () => {
      const result = AchievementMatchSchema.parse({
        taskName: 'Test',
        categoryId: 5,
      });
      expect(result.categoryId).toBe(5);
    });
  });

  describe('invalid inputs', () => {
    it('rejects empty task name', () => {
      expect(() => AchievementMatchSchema.parse({ taskName: '' }))
        .toThrow('Task name is required');
    });

    it('rejects missing task name', () => {
      expect(() => AchievementMatchSchema.parse({ categoryId: 1 }))
        .toThrow();
    });

    it('rejects non-positive category ID', () => {
      expect(() => AchievementMatchSchema.parse({ taskName: 'Test', categoryId: 0 }))
        .toThrow('Category ID must be positive');
    });
  });
});

// ============================================================================
// SearchShopItemsSchema Tests
// ============================================================================

describe('SearchShopItemsSchema', () => {
  describe('valid inputs', () => {
    it('accepts empty object', () => {
      const result = SearchShopItemsSchema.parse({});
      expect(result).toEqual({});
    });

    it('accepts with category ID', () => {
      const result = SearchShopItemsSchema.parse({ categoryId: 3 });
      expect(result.categoryId).toBe(3);
    });

    it('accepts with search query', () => {
      const result = SearchShopItemsSchema.parse({ searchQuery: 'potion' });
      expect(result.searchQuery).toBe('potion');
    });

    it('accepts with price range', () => {
      const result = SearchShopItemsSchema.parse({ minPrice: 10, maxPrice: 1000 });
      expect(result.minPrice).toBe(10);
      expect(result.maxPrice).toBe(1000);
    });

    it('accepts all fields', () => {
      const input = {
        categoryId: 2,
        searchQuery: 'item',
        minPrice: 0,
        maxPrice: 5000,
      };
      const result = SearchShopItemsSchema.parse(input);
      expect(result).toMatchObject(input);
    });
  });

  describe('invalid inputs', () => {
    it('rejects non-positive category ID', () => {
      expect(() => SearchShopItemsSchema.parse({ categoryId: 0 }))
        .toThrow('Category ID must be positive');
    });

    it('rejects search query exceeding 200 characters', () => {
      const longQuery = 'x'.repeat(201);
      expect(() => SearchShopItemsSchema.parse({ searchQuery: longQuery }))
        .toThrow('Search query cannot exceed 200 characters');
    });

    it('rejects negative minPrice', () => {
      expect(() => SearchShopItemsSchema.parse({ minPrice: -5 }))
        .toThrow('Minimum price must be non-negative');
    });

    it('rejects negative maxPrice', () => {
      expect(() => SearchShopItemsSchema.parse({ maxPrice: -10 }))
        .toThrow('Maximum price must be non-negative');
    });
  });
});

// ============================================================================
// CreateAchievementSchema Tests
// ============================================================================

describe('CreateAchievementSchema', () => {
  describe('valid inputs', () => {
    it('accepts minimal achievement', () => {
      const result = CreateAchievementSchema.parse({
        name: 'New Achievement',
        category_id: 1,
      });
      expect(result.name).toBe('New Achievement');
      expect(result.category_id).toBe(1);
      expect(result.unlocked).toBe(false);
    });

    it('accepts with full details', () => {
      const input = {
        name: 'Epic Achievement',
        category_id: 2,
        desc: 'This is a great achievement',
        exp: 1000,
        coin: 500,
        coin_var: 50,
        secret: true,
        color: '#FF6B6B',
        unlocked: false,
        skills: [1, 2],
      };
      const result = CreateAchievementSchema.parse(input);
      expect(result).toMatchObject(input);
    });

    it('accepts with conditions array', () => {
      const result = CreateAchievementSchema.parse({
        name: 'Test',
        category_id: 1,
        conditions_json: [{ type: 5, target: 1000 }],
      });
      expect(result.conditions_json).toHaveLength(1);
    });

    it('accepts with skill rewards', () => {
      const result = CreateAchievementSchema.parse({
        name: 'Test',
        category_id: 1,
        skills: [1, 2, 3],
      });
      expect(result.skills).toEqual([1, 2, 3]);
    });

    it('accepts with item rewards', () => {
      const result = CreateAchievementSchema.parse({
        name: 'Test',
        category_id: 1,
        items: [{ item_id: 1, amount: 5 }],
      });
      expect(result.items).toHaveLength(1);
      expect(result.items![0].amount).toBe(5);
    });
  });

  describe('invalid inputs', () => {
    it('rejects empty name', () => {
      expect(() => CreateAchievementSchema.parse({ name: '', category_id: 1 }))
        .toThrow('Achievement name is required');
    });

    it('rejects name exceeding 100 characters', () => {
      const longName = 'x'.repeat(101);
      expect(() => CreateAchievementSchema.parse({ name: longName, category_id: 1 }))
        .toThrow('Name cannot exceed 100 characters');
    });

    it('rejects non-positive category ID', () => {
      expect(() => CreateAchievementSchema.parse({ name: 'Test', category_id: 0 }))
        .toThrow('Category ID must be positive');
    });

    it('rejects invalid hex color', () => {
      expect(() => CreateAchievementSchema.parse({
        name: 'Test',
        category_id: 1,
        color: 'notahex',
      })).toThrow('Color must be hex format');
    });

    it('rejects negative coin', () => {
      expect(() => CreateAchievementSchema.parse({
        name: 'Test',
        category_id: 1,
        coin: -5,
      })).toThrow();
    });

    it('rejects coin exceeding 999999', () => {
      expect(() => CreateAchievementSchema.parse({
        name: 'Test',
        category_id: 1,
        coin: 1000000,
      })).toThrow('Coin must be 0-999999');
    });
  });

  describe('edge cases', () => {
    it('accepts exactly 100 character name', () => {
      const name = 'x'.repeat(100);
      const result = CreateAchievementSchema.parse({ name, category_id: 1 });
      expect(result.name).toBe(name);
    });

    it('accepts valid hex color variations', () => {
      const result1 = CreateAchievementSchema.parse({
        name: 'Test',
        category_id: 1,
        color: '#FFFFFF',
      });
      const result2 = CreateAchievementSchema.parse({
        name: 'Test',
        category_id: 1,
        color: '#000000',
      });
      const result3 = CreateAchievementSchema.parse({
        name: 'Test',
        category_id: 1,
        color: '#abcdef',
      });
      expect(result1.color).toBe('#FFFFFF');
      expect(result2.color).toBe('#000000');
      expect(result3.color).toBe('#abcdef');
    });
  });

  describe('exp and skills relationship validation', () => {
    it('rejects exp without skills', () => {
      expect(() => CreateAchievementSchema.parse({
        name: 'Test',
        category_id: 1,
        exp: 100,
      })).toThrow('When exp is specified, skills must be provided as a non-empty array');
    });

    it('rejects exp with empty skills array', () => {
      expect(() => CreateAchievementSchema.parse({
        name: 'Test',
        category_id: 1,
        exp: 100,
        skills: [],
      })).toThrow('When exp is specified, skills must be provided as a non-empty array');
    });

    it('accepts exp with non-empty skills', () => {
      const result = CreateAchievementSchema.parse({
        name: 'Test',
        category_id: 1,
        exp: 100,
        skills: [1],
      });
      expect(result.exp).toBe(100);
      expect(result.skills).toEqual([1]);
    });

    it('accepts skills without exp (one-way validation)', () => {
      const result = CreateAchievementSchema.parse({
        name: 'Test',
        category_id: 1,
        skills: [1, 2],
      });
      expect(result.skills).toEqual([1, 2]);
      expect(result.exp).toBeUndefined();
    });

    it('accepts exp of 0 with skills (edge case)', () => {
      const result = CreateAchievementSchema.parse({
        name: 'Test',
        category_id: 1,
        exp: 0,
        skills: [1],
      });
      expect(result.exp).toBe(0);
      expect(result.skills).toEqual([1]);
    });
  });
});

// ============================================================================
// UpdateAchievementSchema Tests
// ============================================================================

describe('UpdateAchievementSchema', () => {
  describe('valid inputs', () => {
    it('accepts minimal update with just ID', () => {
      const result = UpdateAchievementSchema.parse({ edit_id: 5 });
      expect(result.edit_id).toBe(5);
    });

    it('accepts update with name change', () => {
      const result = UpdateAchievementSchema.parse({
        edit_id: 5,
        name: 'Updated Name',
      });
      expect(result.name).toBe('Updated Name');
    });

    it('accepts with set_type fields', () => {
      const result = UpdateAchievementSchema.parse({
        edit_id: 5,
        coin: 100,
        coin_set_type: 'relative',
        exp: 50,
        exp_set_type: 'absolute',
        skills: [1],
      });
      expect(result.coin_set_type).toBe('relative');
      expect(result.exp_set_type).toBe('absolute');
    });
  });

  describe('invalid inputs', () => {
    it('rejects missing edit_id', () => {
      expect(() => UpdateAchievementSchema.parse({ name: 'Test' }))
        .toThrow();
    });

    it('rejects non-positive edit_id', () => {
      expect(() => UpdateAchievementSchema.parse({ edit_id: 0 }))
        .toThrow();
    });

    it('rejects invalid set_type', () => {
      expect(() => UpdateAchievementSchema.parse({
        edit_id: 5,
        coin_set_type: 'invalid' as any,
      })).toThrow();
    });
  });

  describe('exp and skills relationship validation', () => {
    it('rejects exp without skills', () => {
      expect(() => UpdateAchievementSchema.parse({
        edit_id: 5,
        exp: 100,
      })).toThrow('When exp is specified, skills must be provided as a non-empty array');
    });

    it('rejects exp with empty skills array', () => {
      expect(() => UpdateAchievementSchema.parse({
        edit_id: 5,
        exp: 100,
        skills: [],
      })).toThrow('When exp is specified, skills must be provided as a non-empty array');
    });

    it('accepts exp with non-empty skills', () => {
      const result = UpdateAchievementSchema.parse({
        edit_id: 5,
        exp: 100,
        skills: [1],
      });
      expect(result.exp).toBe(100);
      expect(result.skills).toEqual([1]);
    });

    it('accepts skills without exp (one-way validation)', () => {
      const result = UpdateAchievementSchema.parse({
        edit_id: 5,
        skills: [1, 2],
      });
      expect(result.skills).toEqual([1, 2]);
      expect(result.exp).toBeUndefined();
    });

    it('accepts exp of 0 with skills (edge case)', () => {
      const result = UpdateAchievementSchema.parse({
        edit_id: 5,
        exp: 0,
        skills: [1],
      });
      expect(result.exp).toBe(0);
      expect(result.skills).toEqual([1]);
    });
  });
});

// ============================================================================
// DeleteAchievementSchema Tests
// ============================================================================

describe('DeleteAchievementSchema', () => {
  describe('valid inputs', () => {
    it('accepts valid ID', () => {
      const result = DeleteAchievementSchema.parse({ edit_id: 10 });
      expect(result.edit_id).toBe(10);
    });
  });

  describe('invalid inputs', () => {
    it('rejects missing ID', () => {
      expect(() => DeleteAchievementSchema.parse({}))
        .toThrow();
    });

    it('rejects non-positive ID', () => {
      expect(() => DeleteAchievementSchema.parse({ edit_id: 0 }))
        .toThrow();
    });
  });
});

// ============================================================================
// EditTaskSchema Tests
// ============================================================================

describe('EditTaskSchema', () => {
  describe('valid inputs', () => {
    it('accepts update with id', () => {
      const result = EditTaskSchema.parse({ id: 5, name: 'Updated' });
      expect(result.id).toBe(5);
      expect(result.name).toBe('Updated');
    });

    it('accepts update with gid', () => {
      const result = EditTaskSchema.parse({ gid: 3, name: 'Updated' });
      expect(result.gid).toBe(3);
    });

    it('accepts update with just name (satisfies refine)', () => {
      const result = EditTaskSchema.parse({ name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('accepts full update with all fields', () => {
      const input = {
        id: 1,
        name: 'Updated Task',
        exp: 200,
        coin: 100,
        category: 2,
        color: '#FF6B6B',
        skills: [1, 2],
      };
      const result = EditTaskSchema.parse(input);
      expect(result).toMatchObject(input);
    });

    it('accepts with background URL', () => {
      const result = EditTaskSchema.parse({
        id: 1,
        background_url: 'https://example.com/image.jpg',
      });
      expect(result.background_url).toBe('https://example.com/image.jpg');
    });

    it('accepts with skills array', () => {
      const result = EditTaskSchema.parse({
        id: 1,
        skills: [1, 2, 3],
      });
      expect(result.skills).toEqual([1, 2, 3]);
    });
  });

  describe('invalid inputs', () => {
    it('rejects when id, gid, and name are all missing', () => {
      expect(() => EditTaskSchema.parse({ exp: 100 }))
        .toThrow('At least one of id, gid, or name must be provided');
    });

    it('rejects non-positive id', () => {
      expect(() => EditTaskSchema.parse({ id: 0, name: 'Test' }))
        .toThrow('Task ID must be positive');
    });

    it('rejects non-positive gid', () => {
      expect(() => EditTaskSchema.parse({ gid: -1, name: 'Test' }))
        .toThrow('Group ID must be positive');
    });

    it('rejects name exceeding 200 characters', () => {
      const longName = 'x'.repeat(201);
      expect(() => EditTaskSchema.parse({ id: 1, name: longName }))
        .toThrow('Name cannot exceed 200 characters');
    });

    it('rejects invalid background URL', () => {
      expect(() => EditTaskSchema.parse({
        id: 1,
        background_url: 'not-a-url',
      })).toThrow('Background URL must be valid');
    });

    it('rejects background alpha outside 0-1', () => {
      expect(() => EditTaskSchema.parse({
        id: 1,
        background_alpha: 1.5,
      })).toThrow();
    });

    it('rejects item amount outside 1-99', () => {
      expect(() => EditTaskSchema.parse({
        id: 1,
        item_amount: 100,
      })).toThrow('Item amount must be 1-99');
    });
  });

  describe('edge cases', () => {
    it('accepts background alpha of 0', () => {
      const result = EditTaskSchema.parse({ id: 1, background_alpha: 0 });
      expect(result.background_alpha).toBe(0);
    });

    it('accepts background alpha of 1', () => {
      const result = EditTaskSchema.parse({ id: 1, background_alpha: 1 });
      expect(result.background_alpha).toBe(1);
    });
  });

  describe('exp and skills relationship validation', () => {
    it('rejects exp without skills', () => {
      expect(() => EditTaskSchema.parse({ id: 1, exp: 100 }))
        .toThrow('When exp is specified, skills must be provided as a non-empty array');
    });

    it('rejects exp with empty skills array', () => {
      expect(() => EditTaskSchema.parse({ id: 1, exp: 100, skills: [] }))
        .toThrow('When exp is specified, skills must be provided as a non-empty array');
    });

    it('accepts exp with non-empty skills', () => {
      const result = EditTaskSchema.parse({ id: 1, exp: 100, skills: [1] });
      expect(result.exp).toBe(100);
      expect(result.skills).toEqual([1]);
    });

    it('accepts skills without exp (one-way validation)', () => {
      const result = EditTaskSchema.parse({ id: 1, skills: [1, 2] });
      expect(result.skills).toEqual([1, 2]);
      expect(result.exp).toBeUndefined();
    });

    it('accepts exp of 0 with skills (edge case)', () => {
      const result = EditTaskSchema.parse({ id: 1, exp: 0, skills: [1] });
      expect(result.exp).toBe(0);
      expect(result.skills).toEqual([1]);
    });
  });

  describe('count task validation (task_type and target_times)', () => {
    it('accepts count task update with valid task_type and target_times', () => {
      const result = EditTaskSchema.parse({
        id: 1,
        task_type: 1,
        target_times: 10,
      });
      expect(result.task_type).toBe(1);
      expect(result.target_times).toBe(10);
    });

    it('accepts count task with is_affect_shop_reward', () => {
      const result = EditTaskSchema.parse({
        id: 1,
        task_type: 1,
        target_times: 3,
        is_affect_shop_reward: false,
      });
      expect(result.is_affect_shop_reward).toBe(false);
    });

    it('rejects count task (task_type=1) without target_times', () => {
      expect(() => EditTaskSchema.parse({
        id: 1,
        task_type: 1,
      })).toThrow('When task_type is 1 (count task), target_times must be provided and must be positive');
    });

    it('rejects count task with zero target_times', () => {
      expect(() => EditTaskSchema.parse({
        id: 1,
        task_type: 1,
        target_times: 0,
      })).toThrow('Target times must be positive');
    });

    it('rejects count task with negative target_times', () => {
      expect(() => EditTaskSchema.parse({
        id: 1,
        task_type: 1,
        target_times: -3,
      })).toThrow('Target times must be positive');
    });

    it('accepts converting task to normal type (task_type=0)', () => {
      const result = EditTaskSchema.parse({
        id: 1,
        task_type: 0,
      });
      expect(result.task_type).toBe(0);
    });

    it('accepts task_type update without target_times for non-count tasks', () => {
      const result = EditTaskSchema.parse({
        id: 1,
        task_type: 2,
      });
      expect(result.task_type).toBe(2);
      expect(result.target_times).toBeUndefined();
    });

    it('rejects task_type outside valid range', () => {
      expect(() => EditTaskSchema.parse({
        id: 1,
        task_type: 5,
      })).toThrow('Task type must be 0-3');
    });

    it('accepts updating target_times alone (for existing count task)', () => {
      const result = EditTaskSchema.parse({
        id: 1,
        target_times: 15,
      });
      expect(result.target_times).toBe(15);
    });
  });
});

// ============================================================================
// AddShopItemSchema Tests
// ============================================================================

describe('AddShopItemSchema', () => {
  describe('valid inputs', () => {
    it('accepts minimal item with just name', () => {
      const result = AddShopItemSchema.parse({ name: 'Potion' });
      expect(result.name).toBe('Potion');
    });

    it('accepts with all optional fields', () => {
      const input = {
        name: 'Magic Sword',
        desc: 'A powerful sword',
        price: 500,
        stock_number: 10,
        category: 3,
        disable_purchase: false,
      };
      const result = AddShopItemSchema.parse(input);
      expect(result).toMatchObject(input);
    });

    it('accepts with icon URL', () => {
      const result = AddShopItemSchema.parse({
        name: 'Item',
        icon: 'https://example.com/icon.png',
      });
      expect(result.icon).toBe('https://example.com/icon.png');
    });

    it('accepts with hex color', () => {
      const result = AddShopItemSchema.parse({
        name: 'Item',
        title_color_string: '#FF5733',
      });
      expect(result.title_color_string).toBe('#FF5733');
    });

    it('accepts with stock of -1 (unlimited)', () => {
      const result = AddShopItemSchema.parse({
        name: 'Item',
        stock_number: -1,
      });
      expect(result.stock_number).toBe(-1);
    });

    it('accepts with purchase limits', () => {
      const result = AddShopItemSchema.parse({
        name: 'Item',
        purchase_limit: [{ type: 'daily', value: 5 }],
      });
      expect(result.purchase_limit).toHaveLength(1);
    });
  });

  describe('invalid inputs', () => {
    it('rejects empty name', () => {
      expect(() => AddShopItemSchema.parse({ name: '' }))
        .toThrow('Item name is required');
    });

    it('rejects name exceeding 100 characters', () => {
      const longName = 'x'.repeat(101);
      expect(() => AddShopItemSchema.parse({ name: longName }))
        .toThrow('Name cannot exceed 100 characters');
    });

    it('rejects description exceeding 500 characters', () => {
      const longDesc = 'x'.repeat(501);
      expect(() => AddShopItemSchema.parse({ name: 'Item', desc: longDesc }))
        .toThrow('Description cannot exceed 500 characters');
    });

    it('rejects negative price', () => {
      expect(() => AddShopItemSchema.parse({ name: 'Item', price: -10 }))
        .toThrow('Price must be non-negative');
    });

    it('rejects stock outside valid range', () => {
      expect(() => AddShopItemSchema.parse({ name: 'Item', stock_number: -2 }))
        .toThrow();
    });

    it('rejects invalid icon URL', () => {
      expect(() => AddShopItemSchema.parse({
        name: 'Item',
        icon: 'not-a-url',
      })).toThrow('Icon must be valid URL');
    });

    it('rejects invalid color format', () => {
      expect(() => AddShopItemSchema.parse({
        name: 'Item',
        title_color_string: 'red',
      })).toThrow('Color must be hex format');
    });

    it('rejects action text exceeding 50 characters', () => {
      const longText = 'x'.repeat(51);
      expect(() => AddShopItemSchema.parse({
        name: 'Item',
        action_text: longText,
      })).toThrow('Action text cannot exceed 50 characters');
    });

    it('rejects negative own_number', () => {
      expect(() => AddShopItemSchema.parse({
        name: 'Item',
        own_number: -1,
      })).toThrow('Own number must be non-negative');
    });
  });

  describe('edge cases', () => {
    it('accepts exactly 100 character name', () => {
      const name = 'x'.repeat(100);
      const result = AddShopItemSchema.parse({ name });
      expect(result.name).toBe(name);
    });

    it('accepts stock of 0', () => {
      const result = AddShopItemSchema.parse({ name: 'Item', stock_number: 0 });
      expect(result.stock_number).toBe(0);
    });

    it('accepts stock of exactly 99999', () => {
      const result = AddShopItemSchema.parse({ name: 'Item', stock_number: 99999 });
      expect(result.stock_number).toBe(99999);
    });
  });
});

// ============================================================================
// EditShopItemSchema Tests
// ============================================================================

describe('EditShopItemSchema', () => {
  describe('valid inputs', () => {
    it('accepts update with id and new name', () => {
      const result = EditShopItemSchema.parse({ id: 5, set_name: 'New Name' });
      expect(result.id).toBe(5);
      expect(result.set_name).toBe('New Name');
    });

    it('accepts update with name and new settings', () => {
      const result = EditShopItemSchema.parse({
        name: 'Old Name',
        set_price: 150,
        set_price_type: 'absolute',
      });
      expect(result.name).toBe('Old Name');
    });

    it('accepts with relative price adjustment', () => {
      const result = EditShopItemSchema.parse({
        id: 5,
        set_price: 50,
        set_price_type: 'relative',
      });
      expect(result.set_price_type).toBe('relative');
    });

    it('accepts with stock adjustment', () => {
      const result = EditShopItemSchema.parse({
        id: 5,
        stock_number: 100,
        stock_number_type: 'absolute',
      });
      expect(result.stock_number_type).toBe('absolute');
    });

    it('accepts with own_number adjustment', () => {
      const result = EditShopItemSchema.parse({
        id: 5,
        own_number: 5,
        own_number_type: 'relative',
      });
      expect(result.own_number_type).toBe('relative');
    });
  });

  describe('invalid inputs', () => {
    it('rejects when neither id nor name is provided', () => {
      expect(() => EditShopItemSchema.parse({ set_name: 'New' }))
        .toThrow('Either id or name must be provided');
    });

    it('rejects non-positive id', () => {
      expect(() => EditShopItemSchema.parse({ id: 0 }))
        .toThrow('Item ID must be positive');
    });

    it('rejects set_name that is empty', () => {
      expect(() => EditShopItemSchema.parse({ id: 5, set_name: '' }))
        .toThrow('New name cannot be empty');
    });

    it('rejects set_name exceeding 100 characters', () => {
      const longName = 'x'.repeat(101);
      expect(() => EditShopItemSchema.parse({ id: 5, set_name: longName }))
        .toThrow('Name cannot exceed 100 characters');
    });

    it('rejects invalid set_icon URL', () => {
      expect(() => EditShopItemSchema.parse({
        id: 5,
        set_icon: 'not-a-url',
      })).toThrow('Icon must be valid URL');
    });

    it('rejects invalid set_price_type', () => {
      expect(() => EditShopItemSchema.parse({
        id: 5,
        set_price_type: 'invalid' as any,
      })).toThrow();
    });

    it('rejects stock outside valid range', () => {
      expect(() => EditShopItemSchema.parse({
        id: 5,
        stock_number: -2,
      })).toThrow();
    });
  });
});

// ============================================================================
// ApplyPenaltySchema Tests
// ============================================================================

describe('ApplyPenaltySchema', () => {
  describe('valid inputs', () => {
    it('accepts coin penalty', () => {
      const result = ApplyPenaltySchema.parse({
        type: 'coin',
        content: 'Penalty reason',
        number: 100,
      });
      expect(result.type).toBe('coin');
      expect(result.number).toBe(100);
    });

    it('accepts exp penalty', () => {
      const result = ApplyPenaltySchema.parse({
        type: 'exp',
        content: 'Lost experience',
        number: 500,
      });
      expect(result.type).toBe('exp');
    });

    it('accepts item penalty with item_id', () => {
      const result = ApplyPenaltySchema.parse({
        type: 'item',
        content: 'Lost item',
        number: 3,
        item_id: 5,
      });
      expect(result.item_id).toBe(5);
    });

    it('accepts item penalty with item_name', () => {
      const result = ApplyPenaltySchema.parse({
        type: 'item',
        content: 'Lost item',
        number: 2,
        item_name: 'Potion',
      });
      expect(result.item_name).toBe('Potion');
    });

    it('accepts with skills array', () => {
      const result = ApplyPenaltySchema.parse({
        type: 'exp',
        content: 'Skill penalty',
        number: 100,
        skills: [1, 2, 3],
      });
      expect(result.skills).toEqual([1, 2, 3]);
    });

    it('accepts silent flag', () => {
      const result = ApplyPenaltySchema.parse({
        type: 'coin',
        content: 'Silent penalty',
        number: 50,
        silent: true,
      });
      expect(result.silent).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('rejects invalid type', () => {
      expect(() => ApplyPenaltySchema.parse({
        type: 'invalid',
        content: 'Test',
        number: 100,
      })).toThrow();
    });

    it('rejects empty content', () => {
      expect(() => ApplyPenaltySchema.parse({
        type: 'coin',
        content: '',
        number: 100,
      })).toThrow('Penalty reason is required');
    });

    it('rejects content exceeding 200 characters', () => {
      const longContent = 'x'.repeat(201);
      expect(() => ApplyPenaltySchema.parse({
        type: 'coin',
        content: longContent,
        number: 100,
      })).toThrow('Reason cannot exceed 200 characters');
    });

    it('rejects non-positive number', () => {
      expect(() => ApplyPenaltySchema.parse({
        type: 'coin',
        content: 'Test',
        number: 0,
      })).toThrow('Number must be positive');
    });

    it('rejects number exceeding 999999', () => {
      expect(() => ApplyPenaltySchema.parse({
        type: 'coin',
        content: 'Test',
        number: 1000000,
      })).toThrow('Number too large');
    });

    it('rejects item penalty without item_id or item_name', () => {
      expect(() => ApplyPenaltySchema.parse({
        type: 'item',
        content: 'Test',
        number: 5,
      })).toThrow('Either item_id or item_name must be provided when type is item');
    });

    it('rejects non-positive skill ID', () => {
      expect(() => ApplyPenaltySchema.parse({
        type: 'coin',
        content: 'Test',
        number: 100,
        skills: [0],
      })).toThrow('Skill IDs must be positive');
    });
  });
});

// ============================================================================
// EditSkillSchema Tests
// ============================================================================

describe('EditSkillSchema', () => {
  describe('valid inputs - creating', () => {
    it('accepts new skill with content', () => {
      const result = EditSkillSchema.parse({ content: 'New Skill' });
      expect(result.content).toBe('New Skill');
    });

    it('accepts new skill with all optional fields', () => {
      const input = {
        content: 'Advanced Skill',
        desc: 'Skill description',
        icon: '⭐',
        color: '#FFD700',
        type: 1,
        order: 5,
      };
      const result = EditSkillSchema.parse(input);
      expect(result).toMatchObject(input);
    });
  });

  describe('valid inputs - editing', () => {
    it('accepts edit with id only', () => {
      const result = EditSkillSchema.parse({ id: 10 });
      expect(result.id).toBe(10);
    });

    it('accepts edit with id and updates', () => {
      const result = EditSkillSchema.parse({
        id: 10,
        content: 'Updated Name',
        exp: 100,
      });
      expect(result.id).toBe(10);
      expect(result.content).toBe('Updated Name');
    });

    it('accepts delete flag with id', () => {
      const result = EditSkillSchema.parse({ id: 10, delete: true });
      expect(result.delete).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('rejects when creating without content', () => {
      expect(() => EditSkillSchema.parse({ desc: 'Only description' }))
        .toThrow('When creating a skill, content (name) is required');
    });

    it('rejects non-positive id when provided', () => {
      expect(() => EditSkillSchema.parse({ id: 0 }))
        .toThrow('Skill ID must be positive');
    });

    it('rejects content exceeding 100 characters', () => {
      const longContent = 'x'.repeat(101);
      expect(() => EditSkillSchema.parse({ content: longContent }))
        .toThrow('Name cannot exceed 100 characters');
    });

    it('rejects description exceeding 500 characters', () => {
      const longDesc = 'x'.repeat(501);
      expect(() => EditSkillSchema.parse({ id: 1, desc: longDesc }))
        .toThrow('Description cannot exceed 500 characters');
    });

    it('rejects icon exceeding 10 characters', () => {
      const longIcon = 'x'.repeat(11);
      expect(() => EditSkillSchema.parse({ id: 1, icon: longIcon }))
        .toThrow('Icon cannot exceed 10 characters');
    });

    it('rejects invalid color format', () => {
      expect(() => EditSkillSchema.parse({
        id: 1,
        color: 'notacolor',
      })).toThrow('Color must be hex format');
    });

    it('rejects negative experience', () => {
      expect(() => EditSkillSchema.parse({
        id: 1,
        exp: -5,
      })).toThrow('Experience must be non-negative');
    });
  });

  describe('edge cases', () => {
    it('accepts exactly 100 character content', () => {
      const content = 'x'.repeat(100);
      const result = EditSkillSchema.parse({ content });
      expect(result.content).toBe(content);
    });

    it('accepts icon of exactly 10 characters', () => {
      const icon = 'x'.repeat(10);
      const result = EditSkillSchema.parse({ id: 1, icon });
      expect(result.icon).toBe(icon);
    });
  });
});

// ============================================================================
// ItemRewardSchema Tests
// ============================================================================

describe('ItemRewardSchema', () => {
  describe('valid inputs', () => {
    it('accepts valid reward', () => {
      const result = ItemRewardSchema.parse({ item_id: 5, amount: 10 });
      expect(result.item_id).toBe(5);
      expect(result.amount).toBe(10);
    });

    it('accepts minimum amount', () => {
      const result = ItemRewardSchema.parse({ item_id: 1, amount: 1 });
      expect(result.amount).toBe(1);
    });

    it('accepts maximum amount', () => {
      const result = ItemRewardSchema.parse({ item_id: 1, amount: 99 });
      expect(result.amount).toBe(99);
    });
  });

  describe('invalid inputs', () => {
    it('rejects non-positive item_id', () => {
      expect(() => ItemRewardSchema.parse({ item_id: 0, amount: 5 }))
        .toThrow('Item ID must be positive');
    });

    it('rejects amount of 0', () => {
      expect(() => ItemRewardSchema.parse({ item_id: 1, amount: 0 }))
        .toThrow();
    });

    it('rejects amount exceeding 99', () => {
      expect(() => ItemRewardSchema.parse({ item_id: 1, amount: 100 }))
        .toThrow();
    });
  });
});

// ============================================================================
// AchievementConditionSchema Tests
// ============================================================================

describe('AchievementConditionSchema', () => {
  describe('valid inputs', () => {
    it('accepts valid condition', () => {
      const result = AchievementConditionSchema.parse({
        type: 5,
        target: 1000,
      });
      expect(result.type).toBe(5);
      expect(result.target).toBe(1000);
    });

    it('accepts with related_id', () => {
      const result = AchievementConditionSchema.parse({
        type: 3,
        target: 100,
        related_id: 7,
      });
      expect(result.related_id).toBe(7);
    });

    it('accepts type 0', () => {
      const result = AchievementConditionSchema.parse({
        type: 0,
        target: 500,
      });
      expect(result.type).toBe(0);
    });

    it('accepts type 20', () => {
      const result = AchievementConditionSchema.parse({
        type: 20,
        target: 50,
      });
      expect(result.type).toBe(20);
    });
  });

  describe('invalid inputs', () => {
    it('rejects type exceeding 20', () => {
      expect(() => AchievementConditionSchema.parse({
        type: 21,
        target: 100,
      })).toThrow('Condition type must be 0-20');
    });

    it('rejects non-positive target', () => {
      expect(() => AchievementConditionSchema.parse({
        type: 5,
        target: 0,
      })).toThrow('Target must be positive');
    });

    it('rejects non-positive related_id', () => {
      expect(() => AchievementConditionSchema.parse({
        type: 5,
        target: 100,
        related_id: 0,
      })).toThrow('Related ID must be positive');
    });
  });
});

// ============================================================================
// ItemEffectSchema Tests
// ============================================================================

describe('ItemEffectSchema', () => {
  describe('valid inputs', () => {
    it('accepts valid effect', () => {
      const result = ItemEffectSchema.parse({ type: 2 });
      expect(result.type).toBe(2);
    });

    it('accepts with info', () => {
      const result = ItemEffectSchema.parse({
        type: 5,
        info: { key: 'value' },
      });
      expect(result.info).toEqual({ key: 'value' });
    });

    it('accepts type 0', () => {
      const result = ItemEffectSchema.parse({ type: 0 });
      expect(result.type).toBe(0);
    });

    it('accepts type 9', () => {
      const result = ItemEffectSchema.parse({ type: 9 });
      expect(result.type).toBe(9);
    });
  });

  describe('invalid inputs', () => {
    it('rejects type exceeding 9', () => {
      expect(() => ItemEffectSchema.parse({ type: 10 }))
        .toThrow();
    });

    it('rejects negative type', () => {
      expect(() => ItemEffectSchema.parse({ type: -1 }))
        .toThrow();
    });
  });
});

// ============================================================================
// PurchaseLimitSchema Tests
// ============================================================================

describe('PurchaseLimitSchema', () => {
  describe('valid inputs', () => {
    it('accepts daily limit', () => {
      const result = PurchaseLimitSchema.parse({ type: 'daily', value: 5 });
      expect(result.type).toBe('daily');
      expect(result.value).toBe(5);
    });

    it('accepts total limit', () => {
      const result = PurchaseLimitSchema.parse({ type: 'total', value: 10 });
      expect(result.type).toBe('total');
      expect(result.value).toBe(10);
    });
  });

  describe('invalid inputs', () => {
    it('rejects invalid type', () => {
      expect(() => PurchaseLimitSchema.parse({ type: 'invalid', value: 5 }))
        .toThrow();
    });

    it('rejects non-positive value', () => {
      expect(() => PurchaseLimitSchema.parse({ type: 'daily', value: 0 }))
        .toThrow('Limit value must be positive');
    });
  });
});

// ============================================================================
// SubtaskDefinitionSchema Tests
// ============================================================================

describe('SubtaskDefinitionSchema', () => {
  describe('valid inputs', () => {
    it('accepts minimal subtask with just todo', () => {
      const result = SubtaskDefinitionSchema.parse({ todo: 'Review notes' });
      expect(result.todo).toBe('Review notes');
    });

    it('accepts subtask with all optional fields', () => {
      const input = {
        todo: 'Complete chapter',
        coin: 50,
        exp: 100,
        remind_time: Date.now() + 86400000,
        order: 1,
        coin_var: 5,
        auto_use_item: true,
        item_id: 1,
        item_amount: 2,
      };
      const result = SubtaskDefinitionSchema.parse(input);
      expect(result).toMatchObject(input);
    });

    it('accepts subtask with item rewards array', () => {
      const result = SubtaskDefinitionSchema.parse({
        todo: 'Task with items',
        items: [
          { item_id: 1, amount: 5 },
          { item_id: 2, amount: 3 },
        ],
      });
      expect(result.items).toHaveLength(2);
    });

    it('accepts exactly 200 character todo', () => {
      const todo = 'x'.repeat(200);
      const result = SubtaskDefinitionSchema.parse({ todo });
      expect(result.todo).toBe(todo);
    });
  });

  describe('invalid inputs', () => {
    it('rejects empty todo', () => {
      expect(() => SubtaskDefinitionSchema.parse({ todo: '' }))
        .toThrow('Subtask content cannot be empty');
    });

    it('rejects todo exceeding 200 characters', () => {
      const longTodo = 'x'.repeat(201);
      expect(() => SubtaskDefinitionSchema.parse({ todo: longTodo }))
        .toThrow('Subtask content cannot exceed 200 characters');
    });

    it('rejects negative coin', () => {
      expect(() => SubtaskDefinitionSchema.parse({ todo: 'Task', coin: -5 }))
        .toThrow('Coin must be non-negative');
    });

    it('rejects coin exceeding 999999', () => {
      expect(() => SubtaskDefinitionSchema.parse({ todo: 'Task', coin: 1000000 }))
        .toThrow('Coin too large');
    });

    it('rejects negative exp', () => {
      expect(() => SubtaskDefinitionSchema.parse({ todo: 'Task', exp: -10 }))
        .toThrow('Experience must be non-negative');
    });

    it('rejects exp exceeding 99999', () => {
      expect(() => SubtaskDefinitionSchema.parse({ todo: 'Task', exp: 100000 }))
        .toThrow('Experience too large');
    });

    it('rejects item amount of 0', () => {
      expect(() => SubtaskDefinitionSchema.parse({ todo: 'Task', item_amount: 0 }))
        .toThrow();
    });

    it('rejects item amount exceeding 99', () => {
      expect(() => SubtaskDefinitionSchema.parse({ todo: 'Task', item_amount: 100 }))
        .toThrow('Item amount must be 1-99');
    });
  });
});

// ============================================================================
// CreateSubtaskSchema Tests
// ============================================================================

describe('CreateSubtaskSchema', () => {
  describe('valid inputs', () => {
    it('accepts subtask with main_id', () => {
      const result = CreateSubtaskSchema.parse({
        main_id: 5,
        todo: 'Subtask content',
      });
      expect(result.main_id).toBe(5);
      expect(result.todo).toBe('Subtask content');
    });

    it('accepts subtask with main_gid', () => {
      const result = CreateSubtaskSchema.parse({
        main_gid: 3,
        todo: 'Subtask',
      });
      expect(result.main_gid).toBe(3);
    });

    it('accepts subtask with main_name', () => {
      const result = CreateSubtaskSchema.parse({
        main_name: 'Parent Task',
        todo: 'Subtask',
      });
      expect(result.main_name).toBe('Parent Task');
    });

    it('accepts subtask with full optional fields', () => {
      const input = {
        main_id: 5,
        todo: 'Complete section',
        coin: 25,
        exp: 50,
        remind_time: Date.now() + 3600000,
        order: 2,
        auto_use_item: true,
        item_id: 3,
        item_amount: 1,
      };
      const result = CreateSubtaskSchema.parse(input);
      expect(result).toMatchObject(input);
    });

    it('accepts subtask with items array', () => {
      const result = CreateSubtaskSchema.parse({
        main_id: 5,
        todo: 'Task',
        items: [{ item_id: 1, amount: 5 }],
      });
      expect(result.items).toHaveLength(1);
    });
  });

  describe('invalid inputs', () => {
    it('rejects subtask without parent task identifier', () => {
      expect(() => CreateSubtaskSchema.parse({ todo: 'Subtask' }))
        .toThrow('At least one of main_id, main_gid, or main_name must be provided');
    });

    it('rejects subtask without todo', () => {
      expect(() => CreateSubtaskSchema.parse({ main_id: 5 }))
        .toThrow();
    });

    it('rejects empty todo', () => {
      expect(() => CreateSubtaskSchema.parse({ main_id: 5, todo: '' }))
        .toThrow('Subtask content is required');
    });

    it('rejects non-positive main_id', () => {
      expect(() => CreateSubtaskSchema.parse({ main_id: 0, todo: 'Task' }))
        .toThrow('Main task ID must be positive');
    });

    it('rejects non-positive main_gid', () => {
      expect(() => CreateSubtaskSchema.parse({ main_gid: -1, todo: 'Task' }))
        .toThrow('Main task group ID must be positive');
    });

    it('rejects todo exceeding 200 characters', () => {
      const longTodo = 'x'.repeat(201);
      expect(() => CreateSubtaskSchema.parse({ main_id: 5, todo: longTodo }))
        .toThrow('Subtask content cannot exceed 200 characters');
    });

    it('rejects main_name exceeding 200 characters', () => {
      const longName = 'x'.repeat(201);
      expect(() => CreateSubtaskSchema.parse({ main_name: longName, todo: 'Task' }))
        .toThrow('Main task name cannot exceed 200 characters');
    });
  });

  describe('parent task identifier validation', () => {
    it('accepts main_id and main_gid together', () => {
      const result = CreateSubtaskSchema.parse({
        main_id: 5,
        main_gid: 3,
        todo: 'Task',
      });
      expect(result.main_id).toBe(5);
      expect(result.main_gid).toBe(3);
    });

    it('accepts main_id and main_name together', () => {
      const result = CreateSubtaskSchema.parse({
        main_id: 5,
        main_name: 'Parent',
        todo: 'Task',
      });
      expect(result.main_id).toBe(5);
      expect(result.main_name).toBe('Parent');
    });

    it('accepts all three identifiers together', () => {
      const result = CreateSubtaskSchema.parse({
        main_id: 5,
        main_gid: 3,
        main_name: 'Parent',
        todo: 'Task',
      });
      expect(result.main_id).toBe(5);
      expect(result.main_gid).toBe(3);
      expect(result.main_name).toBe('Parent');
    });
  });
});

// ============================================================================
// EditSubtaskSchema Tests
// ============================================================================

describe('EditSubtaskSchema', () => {
  describe('valid inputs', () => {
    it('accepts edit with main_id and edit_id', () => {
      const result = EditSubtaskSchema.parse({
        main_id: 5,
        edit_id: 10,
        todo: 'Updated content',
      });
      expect(result.main_id).toBe(5);
      expect(result.edit_id).toBe(10);
    });

    it('accepts edit with main_name and edit_name', () => {
      const result = EditSubtaskSchema.parse({
        main_name: 'Parent Task',
        edit_name: 'Old Subtask Name',
        todo: 'New content',
      });
      expect(result.main_name).toBe('Parent Task');
      expect(result.edit_name).toBe('Old Subtask Name');
    });

    it('accepts edit with relative coin adjustment', () => {
      const result = EditSubtaskSchema.parse({
        main_id: 5,
        edit_id: 10,
        coin: 50,
        coin_set_type: 'relative',
      });
      expect(result.coin_set_type).toBe('relative');
    });

    it('accepts edit with absolute exp adjustment', () => {
      const result = EditSubtaskSchema.parse({
        main_id: 5,
        edit_id: 10,
        exp: 100,
        exp_set_type: 'absolute',
      });
      expect(result.exp_set_type).toBe('absolute');
    });

    it('accepts partial update with only some fields', () => {
      const result = EditSubtaskSchema.parse({
        main_id: 5,
        edit_id: 10,
        coin: 25,
      });
      expect(result.coin).toBe(25);
      expect(result.todo).toBeUndefined();
    });

    it('accepts edit with items array', () => {
      const result = EditSubtaskSchema.parse({
        main_id: 5,
        edit_id: 10,
        items: [{ item_id: 2, amount: 3 }],
      });
      expect(result.items).toHaveLength(1);
    });
  });

  describe('invalid inputs', () => {
    it('rejects edit without parent task identifier', () => {
      expect(() => EditSubtaskSchema.parse({ edit_id: 10, todo: 'Updated' }))
        .toThrow('At least one of main_id, main_gid, or main_name must be provided');
    });

    it('rejects edit without subtask identifier', () => {
      expect(() => EditSubtaskSchema.parse({ main_id: 5, todo: 'Updated' }))
        .toThrow('At least one of edit_id, edit_gid, or edit_name must be provided');
    });

    it('rejects non-positive main_id', () => {
      expect(() => EditSubtaskSchema.parse({
        main_id: 0,
        edit_id: 10,
        todo: 'Updated',
      })).toThrow('Main task ID must be positive');
    });

    it('rejects non-positive edit_id', () => {
      expect(() => EditSubtaskSchema.parse({
        main_id: 5,
        edit_id: -1,
        todo: 'Updated',
      })).toThrow('Subtask ID must be positive');
    });

    it('rejects invalid coin_set_type', () => {
      expect(() => EditSubtaskSchema.parse({
        main_id: 5,
        edit_id: 10,
        coin: 50,
        coin_set_type: 'invalid' as any,
      })).toThrow();
    });

    it('rejects invalid exp_set_type', () => {
      expect(() => EditSubtaskSchema.parse({
        main_id: 5,
        edit_id: 10,
        exp: 100,
        exp_set_type: 'invalid' as any,
      })).toThrow();
    });

    it('rejects todo exceeding 200 characters', () => {
      const longTodo = 'x'.repeat(201);
      expect(() => EditSubtaskSchema.parse({
        main_id: 5,
        edit_id: 10,
        todo: longTodo,
      })).toThrow('Subtask content cannot exceed 200 characters');
    });
  });

  describe('parent and subtask identifier validation', () => {
    it('accepts main_id + main_gid with edit_id + edit_gid', () => {
      const result = EditSubtaskSchema.parse({
        main_id: 5,
        main_gid: 3,
        edit_id: 10,
        edit_gid: 7,
        todo: 'Updated',
      });
      expect(result.main_id).toBe(5);
      expect(result.main_gid).toBe(3);
      expect(result.edit_id).toBe(10);
      expect(result.edit_gid).toBe(7);
    });

    it('accepts main_gid + main_name with edit_name only', () => {
      const result = EditSubtaskSchema.parse({
        main_gid: 3,
        main_name: 'Parent',
        edit_name: 'Subtask',
        todo: 'Updated',
      });
      expect(result.main_gid).toBe(3);
      expect(result.main_name).toBe('Parent');
      expect(result.edit_name).toBe('Subtask');
    });
  });

  describe('set_type validation', () => {
    it('accepts both coin_set_type and exp_set_type together', () => {
      const result = EditSubtaskSchema.parse({
        main_id: 5,
        edit_id: 10,
        coin: 50,
        coin_set_type: 'relative',
        exp: 100,
        exp_set_type: 'absolute',
      });
      expect(result.coin_set_type).toBe('relative');
      expect(result.exp_set_type).toBe('absolute');
    });

    it('accepts coin adjustment without exp_set_type', () => {
      const result = EditSubtaskSchema.parse({
        main_id: 5,
        edit_id: 10,
        coin: 50,
        coin_set_type: 'absolute',
      });
      expect(result.coin_set_type).toBe('absolute');
      expect(result.exp_set_type).toBeUndefined();
    });

    it('accepts exp adjustment without coin_set_type', () => {
      const result = EditSubtaskSchema.parse({
        main_id: 5,
        edit_id: 10,
        exp: 100,
        exp_set_type: 'relative',
      });
      expect(result.exp_set_type).toBe('relative');
      expect(result.coin_set_type).toBeUndefined();
    });
  });
});
