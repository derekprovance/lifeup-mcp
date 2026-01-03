/**
 * Constants for LifeUp Cloud API
 */

export const API_ENDPOINTS = {
  API_GATEWAY: '/api',
  CONTENT_PROVIDER: '/api/contentprovider',
  TASKS: '/tasks',
  TASKS_BY_CATEGORY: (id: number) => `/tasks/${id}`,
  TASK_CATEGORIES: '/tasks_categories',
  HISTORY: '/history',
  ITEMS: '/items',
  ITEMS_BY_LIST: (listId: number) => `/items/${listId}`,
  ITEM_CATEGORIES: '/items_categories',
  SKILLS: '/skills',
  ACHIEVEMENTS: '/achievements',
  ACHIEVEMENTS_BY_CATEGORY: (id: number) => `/achievements/${id}`,
  ACHIEVEMENT_CATEGORIES: '/achievement_categories',
  FEELINGS: '/feelings',
  SYNTHESIS: '/synthesis',
  SYNTHESIS_CATEGORIES: '/synthesis_categories',
  POMODORO_RECORDS: '/pomodoro_records',
  INFO: '/info',
  COIN: '/coin',
} as const;

export const LIFEUP_URL_SCHEMES = {
  // Task creation format: lifeup://api/add_task?name=...&exp=...&coin=...
  TASK_CREATE: 'lifeup://api/add_task',
  // Task editing format: lifeup://api/edit_task?id=...&todo=...
  TASK_EDIT: 'lifeup://api/edit_task',
  // Reward format: lifeup://api/reward?type=coin&content=...&number=...
  REWARD: 'lifeup://api/reward',
  // Achievement creation/update/delete format: lifeup://api/achievement?name=...&category_id=...
  ACHIEVEMENT: 'lifeup://api/achievement',
  // Shop item creation/editing format: lifeup://api/item?name=...&price=...
  ITEM: 'lifeup://api/item',
  // Penalty format: lifeup://api/penalty?type=coin&content=...&number=...
  PENALTY: 'lifeup://api/penalty',
  // Skill creation/editing/deletion format: lifeup://api/skill?content=...&exp=...
  SKILL: 'lifeup://api/skill',
} as const;

// Task status codes
export const TASK_STATUS = {
  ACTIVE: 0,
  COMPLETED: 1,
  ARCHIVED: 2,
} as const;

// Response codes
export const RESPONSE_CODE = {
  SUCCESS: 200,
  UNAUTHORIZED: 401,
  SERVER_ERROR: 500,
  CONTENT_PROVIDER_ERROR: 10002,
} as const;

// Default configuration
export const DEFAULT_CONFIG = {
  HOST: '10.103.2.235',
  PORT: 13276,
  TIMEOUT: 10000,
  RETRIES: 2,
} as const;
