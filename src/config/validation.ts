/**
 * Input validation schemas using Zod
 */

import { z } from 'zod';

export const CreateTaskSchema = z.object({
  name: z
    .string()
    .min(1, 'Task name cannot be empty')
    .max(200, 'Task name cannot exceed 200 characters'),
  exp: z.number().nonnegative('Experience points must be non-negative').optional(),
  coin: z.number().nonnegative('Coin reward must be non-negative').optional(),
  coinVar: z.number().nonnegative('Coin variance must be non-negative').optional(),
  categoryId: z.number().nonnegative('Category ID must be non-negative').optional(),
  deadline: z.number().positive('Deadline must be a valid timestamp').optional(),
  skillIds: z
    .array(z.number().positive('Skill IDs must be positive'))
    .max(20, 'Cannot specify more than 20 skills')
    .optional(),
  content: z.string().max(1000, 'Task content cannot exceed 1000 characters').optional(),
});

export const SearchTasksSchema = z.object({
  categoryId: z.number().positive('Category ID must be positive').optional(),
  searchQuery: z
    .string()
    .max(200, 'Search query cannot exceed 200 characters')
    .optional(),
  status: z.enum(['active', 'completed', 'all']).optional().default('all'),
  deadlineBefore: z.number().positive('Deadline must be a valid timestamp').optional(),
});

export const TaskHistorySchema = z.object({
  offset: z.number().nonnegative('Offset must be non-negative').optional().default(0),
  limit: z
    .number()
    .positive('Limit must be positive')
    .max(1000, 'Limit cannot exceed 1000')
    .optional()
    .default(100),
});

export const AchievementMatchSchema = z.object({
  taskName: z.string().min(1, 'Task name is required'),
  categoryId: z.number().positive('Category ID must be positive').optional(),
});

export const SearchShopItemsSchema = z.object({
  categoryId: z.number().positive('Category ID must be positive').optional(),
  searchQuery: z
    .string()
    .max(200, 'Search query cannot exceed 200 characters')
    .optional(),
  minPrice: z.number().nonnegative('Minimum price must be non-negative').optional(),
  maxPrice: z.number().nonnegative('Maximum price must be non-negative').optional(),
});

export const AchievementConditionSchema = z.object({
  type: z.number().int().min(0).max(20, 'Condition type must be 0-20'),
  related_id: z.number().int().positive('Related ID must be positive').optional().nullable(),
  target: z.number().int().positive('Target must be positive'),
});

export const ItemRewardSchema = z.object({
  item_id: z.number().int().positive('Item ID must be positive'),
  amount: z.number().int().min(1).max(99, 'Amount must be 1-99'),
});

export const CreateAchievementSchema = z.object({
  name: z.string().min(1, 'Achievement name is required').max(100, 'Name cannot exceed 100 characters'),
  category_id: z.number().int().positive('Category ID must be positive'),
  desc: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  conditions_json: z.array(AchievementConditionSchema).optional(),
  exp: z.number().int().min(0, 'Experience must be non-negative').optional(),
  coin: z.number().int().min(0).max(999999, 'Coin must be 0-999999').optional(),
  coin_var: z.number().int().min(0, 'Coin variation must be non-negative').optional(),
  skills: z.array(z.number().int().positive('Skill IDs must be positive')).optional(),
  items: z.array(ItemRewardSchema).optional(),
  item_id: z.number().int().positive('Item ID must be positive').optional(),
  item_amount: z.number().int().min(1).max(99, 'Amount must be 1-99').optional(),
  secret: z.boolean().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be hex format (e.g., #66CCFF)').optional(),
  unlocked: z.boolean().optional().default(false),
  write_feeling: z.boolean().optional(),
});

export const UpdateAchievementSchema = z.object({
  edit_id: z.number().int().positive('Achievement ID must be positive'),
  name: z.string().min(1).max(100, 'Name cannot exceed 100 characters').optional(),
  category_id: z.number().int().positive('Category ID must be positive').optional(),
  desc: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  conditions_json: z.array(AchievementConditionSchema).optional(),
  exp: z.number().int().min(0, 'Experience must be non-negative').optional(),
  coin: z.number().int().min(0).max(999999, 'Coin must be 0-999999').optional(),
  coin_var: z.number().int().min(0, 'Coin variation must be non-negative').optional(),
  coin_set_type: z.enum(['absolute', 'relative']).optional(),
  exp_set_type: z.enum(['absolute', 'relative']).optional(),
  skills: z.array(z.number().int().positive('Skill IDs must be positive')).optional(),
  items: z.array(ItemRewardSchema).optional(),
  item_id: z.number().int().positive('Item ID must be positive').optional(),
  item_amount: z.number().int().min(1).max(99, 'Amount must be 1-99').optional(),
  secret: z.boolean().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be hex format').optional(),
  unlocked: z.boolean().optional(),
});

export const DeleteAchievementSchema = z.object({
  edit_id: z.number().int().positive('Achievement ID must be positive'),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type SearchTasksInput = z.infer<typeof SearchTasksSchema>;
export type TaskHistoryInput = z.infer<typeof TaskHistorySchema>;
export type AchievementMatchInput = z.infer<typeof AchievementMatchSchema>;
export type SearchShopItemsInput = z.infer<typeof SearchShopItemsSchema>;
export type CreateAchievementInput = z.infer<typeof CreateAchievementSchema>;
export type UpdateAchievementInput = z.infer<typeof UpdateAchievementSchema>;
export type DeleteAchievementInput = z.infer<typeof DeleteAchievementSchema>;
