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

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type SearchTasksInput = z.infer<typeof SearchTasksSchema>;
export type TaskHistoryInput = z.infer<typeof TaskHistorySchema>;
export type AchievementMatchInput = z.infer<typeof AchievementMatchSchema>;
