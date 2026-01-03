/**
 * Test fixtures and factory functions for creating test data
 */

import type * as Types from '@/client/types';

// ============================================================================
// Base Fixtures
// ============================================================================

export const mockTask: Types.Task = {
  id: 1,
  gid: 1,
  name: 'Test Task',
  content: 'Task description',
  notes: 'Task notes',
  status: 0,
  exp: 100,
  coin: 50,
  coinVariable: 10,
  skillIds: [1, 2],
  items: [],
  subTasks: [],
  startTime: Date.now(),
  deadline: Date.now() + 86400000,
  created_time: Date.now(),
  update_time: Date.now(),
  frequency: 0,
  categoryId: 1,
  order: 0,
};

export const mockAchievement: Types.Achievement = {
  id: 1,
  name: 'Test Achievement',
  description: 'Achievement description',
  category_id: 1,
  progress: 50,
  target: 100,
  is_unlocked: false,
};

export const mockSkill: Types.Skill = {
  id: 1,
  name: 'Programming',
  description: 'Programming skill',
  icon: '💻',
  level: 5,
  experience: 1500,
  currentLevelExp: 500,
  untilNextLevelExp: 200,
  next_level_exp: 2000,
  order: 0,
  type: 0,
};

export const mockItem: Types.Item = {
  id: 1,
  name: 'Test Item',
  desc: 'Item description',
  icon: '🎁',
  price: 100,
  category_id: 1,
  stockNumber: 10,
  ownNumber: 2,
  disablePurchase: false,
  maxPurchaseNumber: 5,
  order: 0,
};

export const mockCategory: Types.Category = {
  id: 1,
  name: 'Test Category',
  isAsc: true,
  order: 0,
};

export const mockLifeUpInfo: Types.LifeUpInfo = {
  version: '1.0.0',
  playerName: 'TestPlayer',
  level: 10,
  experience: 5000,
};

export const mockTaskHistoryRecord: Types.TaskHistoryRecord = {
  id: 1,
  taskId: 1,
  taskName: 'Test Task',
  completedTime: Date.now(),
  exp: 100,
  coin: 50,
};

export const mockSubTask: Types.SubTask = {
  id: 1,
  gid: 1,
  todo: 'Subtask name',
  status: 0,
  exp: 50,
  coin: 25,
  coinVariable: 5,
  items: [],
  order: 0,
  autoUseItem: false,
};

// ============================================================================
// Factory Functions
// ============================================================================

export function createMockTask(overrides?: Partial<Types.Task>): Types.Task {
  return { ...mockTask, ...overrides };
}

export function createMockAchievement(
  overrides?: Partial<Types.Achievement>
): Types.Achievement {
  return { ...mockAchievement, ...overrides };
}

export function createMockSkill(overrides?: Partial<Types.Skill>): Types.Skill {
  return { ...mockSkill, ...overrides };
}

export function createMockItem(overrides?: Partial<Types.Item>): Types.Item {
  return { ...mockItem, ...overrides };
}

export function createMockCategory(
  overrides?: Partial<Types.Category>
): Types.Category {
  return { ...mockCategory, ...overrides };
}

export function createMockLifeUpInfo(
  overrides?: Partial<Types.LifeUpInfo>
): Types.LifeUpInfo {
  return { ...mockLifeUpInfo, ...overrides };
}

export function createMockTaskHistoryRecord(
  overrides?: Partial<Types.TaskHistoryRecord>
): Types.TaskHistoryRecord {
  return { ...mockTaskHistoryRecord, ...overrides };
}

export function createMockSubTask(
  overrides?: Partial<Types.SubTask>
): Types.SubTask {
  return { ...mockSubTask, ...overrides };
}

// ============================================================================
// Request Factory Functions
// ============================================================================

export function createMockCreateTaskRequest(
  overrides?: Partial<Types.CreateTaskRequest>
): Types.CreateTaskRequest {
  return {
    name: 'Test Task',
    exp: 100,
    coin: 50,
    coinVar: 10,
    categoryId: 1,
    skillIds: [1, 2],
    ...overrides,
  };
}

export function createMockCreateAchievementRequest(
  overrides?: Partial<Types.CreateAchievementRequest>
): Types.CreateAchievementRequest {
  return {
    name: 'Test Achievement',
    category_id: 1,
    desc: 'Achievement description',
    exp: 100,
    coin: 50,
    skills: [1],
    unlocked: false,
    ...overrides,
  };
}

export function createMockUpdateAchievementRequest(
  overrides?: Partial<Types.UpdateAchievementRequest>
): Types.UpdateAchievementRequest {
  return {
    edit_id: 1,
    name: 'Updated Achievement',
    category_id: 1,
    desc: 'Updated description',
    ...overrides,
  };
}

export function createMockEditTaskRequest(
  overrides?: Partial<Types.EditTaskRequest>
): Types.EditTaskRequest {
  return {
    id: 1,
    name: 'Updated Task',
    exp: 150,
    coin: 75,
    category: 1,
    ...overrides,
  };
}

export function createMockAddShopItemRequest(
  overrides?: Partial<Types.AddShopItemRequest>
): Types.AddShopItemRequest {
  return {
    name: 'Test Item',
    desc: 'Item description',
    price: 100,
    stock_number: 10,
    category: 1,
    ...overrides,
  };
}

export function createMockEditShopItemRequest(
  overrides?: Partial<Types.EditShopItemRequest>
): Types.EditShopItemRequest {
  return {
    id: 1,
    set_name: 'Updated Item',
    set_price: 150,
    set_price_type: 'absolute',
    ...overrides,
  };
}

export function createMockApplyPenaltyRequest(
  overrides?: Partial<Types.ApplyPenaltyRequest>
): Types.ApplyPenaltyRequest {
  return {
    type: 'coin',
    content: 'Test penalty',
    number: 50,
    ...overrides,
  };
}

export function createMockEditSkillRequest(
  overrides?: Partial<Types.EditSkillRequest>
): Types.EditSkillRequest {
  return {
    id: 1,
    desc: 'Updated skill description',
    exp: 100,
    ...overrides,
  };
}

// ============================================================================
// Batch Factory Functions
// ============================================================================

export function createMockTasks(count: number): Types.Task[] {
  return Array.from({ length: count }, (_, i) =>
    createMockTask({
      id: i + 1,
      gid: i + 1,
      name: `Task ${i + 1}`,
    })
  );
}

export function createMockAchievements(count: number): Types.Achievement[] {
  return Array.from({ length: count }, (_, i) =>
    createMockAchievement({
      id: i + 1,
      name: `Achievement ${i + 1}`,
    })
  );
}

export function createMockSkills(count: number): Types.Skill[] {
  return Array.from({ length: count }, (_, i) =>
    createMockSkill({
      id: i + 1,
      name: `Skill ${i + 1}`,
    })
  );
}

export function createMockItems(count: number): Types.Item[] {
  return Array.from({ length: count }, (_, i) =>
    createMockItem({
      id: i + 1,
      name: `Item ${i + 1}`,
    })
  );
}
