/**
 * Input validation schemas using Zod
 */

import { z } from 'zod';

export const CreateTaskSchema = z.object({
  name: z
    .string()
    .min(1, 'Task name cannot be empty')
    .max(200, 'Task name cannot exceed 200 characters'),
  // XP is an optional field. When set, requires skillIds to specify which attributes receive the XP.
  // When omitted, the task's XP remains unchanged from its current value.
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
  auto_use_item: z.boolean().optional(),
}).refine(
  (data) => {
    if (data.exp !== undefined) {
      return data.skillIds !== undefined && data.skillIds.length > 0;
    }
    return true;
  },
  {
    message: 'When exp is specified, skillIds must be provided as a non-empty array. Without skillIds, XP cannot be applied to any attributes.',
    path: ['skillIds'],
  }
);

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
}).refine(
  (data) => {
    if (data.exp !== undefined) {
      return data.skills !== undefined && data.skills.length > 0;
    }
    return true;
  },
  {
    message: 'When exp is specified, skills must be provided as a non-empty array. Without skills, XP cannot be applied to any attributes.',
    path: ['skills'],
  }
);

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
}).refine(
  (data) => {
    if (data.exp !== undefined) {
      return data.skills !== undefined && data.skills.length > 0;
    }
    return true;
  },
  {
    message: 'When exp is specified, skills must be provided as a non-empty array. Without skills, XP cannot be applied to any attributes.',
    path: ['skills'],
  }
);

export const DeleteAchievementSchema = z.object({
  edit_id: z.number().int().positive('Achievement ID must be positive'),
});

// Edit Task Schema
export const EditTaskSchema = z.object({
  id: z.number().int().positive('Task ID must be positive').optional(),
  gid: z.number().int().positive('Group ID must be positive').optional(),
  name: z.string().max(200, 'Name cannot exceed 200 characters').optional(),
  todo: z.string().max(200, 'Todo cannot exceed 200 characters').optional(),
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
  coin: z.number().int().min(0, 'Coin must be non-negative').optional(),
  coin_var: z.number().int().min(0, 'Coin variance must be non-negative').optional(),
  exp: z.number().int().min(0, 'Experience must be non-negative').optional(),
  exp_set_type: z.enum(['absolute', 'relative']).optional(),
  coin_set_type: z.enum(['absolute', 'relative']).optional(),
  skills: z.array(z.number().int().positive('Skill IDs must be positive')).optional(),
  category: z.number().int().min(0, 'Category must be non-negative').optional(),
  frequency: z.number().int().optional(),
  importance: z.number().int().min(1).max(4, 'Importance must be 1-4').optional(),
  difficulty: z.number().int().min(1).max(4, 'Difficulty must be 1-4').optional(),
  deadline: z.number().int().positive('Deadline must be valid timestamp').optional(),
  remind_time: z.number().int().positive('Remind time must be valid timestamp').optional(),
  start_time: z.number().int().positive('Start time must be valid timestamp').optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be hex format').optional(),
  background_url: z.string().url('Background URL must be valid').optional(),
  background_alpha: z.number().min(0).max(1, 'Background alpha must be 0-1').optional(),
  enable_outline: z.boolean().optional(),
  use_light_remark_text_color: z.boolean().optional(),
  item_id: z.number().int().positive('Item ID must be positive').optional(),
  item_name: z.string().optional(),
  item_amount: z.number().int().min(1).max(99, 'Item amount must be 1-99').optional(),
  items: z.array(ItemRewardSchema).optional(),
  auto_use_item: z.boolean().optional(),
  frozen: z.boolean().optional(),
}).refine(
  (data) => data.id !== undefined || data.gid !== undefined || data.name !== undefined,
  { message: 'At least one of id, gid, or name must be provided' }
).refine(
  (data) => {
    if (data.exp !== undefined) {
      return data.skills !== undefined && data.skills.length > 0;
    }
    return true;
  },
  {
    message: 'When exp is specified, skills must be provided as a non-empty array. Without skills, XP cannot be applied to any attributes.',
    path: ['skills'],
  }
);

// Item Effect Schema
export const ItemEffectSchema = z.object({
  type: z.number().int().min(0).max(9, 'Effect type must be 0-9'),
  info: z.any().optional(),
});

// Purchase Limit Schema
export const PurchaseLimitSchema = z.object({
  type: z.enum(['daily', 'total']),
  value: z.number().int().positive('Limit value must be positive'),
});

// Add Shop Item Schema
export const AddShopItemSchema = z.object({
  name: z.string().min(1, 'Item name is required').max(100, 'Name cannot exceed 100 characters'),
  desc: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  icon: z.string().url('Icon must be valid URL').optional(),
  title_color_string: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be hex format').optional(),
  price: z.number().int().min(0, 'Price must be non-negative').optional(),
  stock_number: z.number().int().min(-1).max(99999, 'Stock must be -1 to 99999').optional(),
  action_text: z.string().max(50, 'Action text cannot exceed 50 characters').optional(),
  disable_purchase: z.boolean().optional(),
  disable_use: z.boolean().optional(),
  category: z.number().int().min(0, 'Category must be non-negative').optional(),
  order: z.number().int().optional(),
  purchase_limit: z.array(PurchaseLimitSchema).optional(),
  effects: z.array(ItemEffectSchema).optional(),
  own_number: z.number().int().min(0, 'Own number must be non-negative').optional(),
  unlist: z.boolean().optional(),
});

// Edit Shop Item Schema
export const EditShopItemSchema = z.object({
  id: z.number().int().positive('Item ID must be positive').optional(),
  name: z.string().max(100, 'Name cannot exceed 100 characters').optional(),
  set_name: z.string().min(1, 'New name cannot be empty').max(100, 'Name cannot exceed 100 characters').optional(),
  set_desc: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  set_icon: z.string().url('Icon must be valid URL').optional(),
  set_price: z.number().int().optional(),
  set_price_type: z.enum(['absolute', 'relative']).optional(),
  own_number: z.number().int().optional(),
  own_number_type: z.enum(['absolute', 'relative']).optional(),
  stock_number: z.number().int().min(-1).max(99999, 'Stock must be -1 to 99999').optional(),
  stock_number_type: z.enum(['absolute', 'relative']).optional(),
  disable_purchase: z.boolean().optional(),
  disable_use: z.boolean().optional(),
  action_text: z.string().max(50, 'Action text cannot exceed 50 characters').optional(),
  title_color_string: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be hex format').optional(),
  effects: z.array(ItemEffectSchema).optional(),
  purchase_limit: z.array(PurchaseLimitSchema).optional(),
  category_id: z.number().int().min(0, 'Category must be non-negative').optional(),
  order: z.number().int().optional(),
  unlist: z.boolean().optional(),
}).refine(
  (data) => data.id !== undefined || data.name !== undefined,
  { message: 'Either id or name must be provided' }
);

// Apply Penalty Schema
export const ApplyPenaltySchema = z.object({
  type: z.enum(['coin', 'exp', 'item'], { errorMap: () => ({ message: 'Type must be coin, exp, or item' }) }),
  content: z.string().min(1, 'Penalty reason is required').max(200, 'Reason cannot exceed 200 characters'),
  number: z.number().int().positive('Number must be positive').max(999999, 'Number too large'),
  skills: z.array(z.number().int().positive('Skill IDs must be positive')).optional(),
  item_id: z.number().int().positive('Item ID must be positive').optional(),
  item_name: z.string().optional(),
  silent: z.boolean().optional(),
}).refine(
  (data) => {
    if (data.type === 'item') {
      return data.item_id !== undefined || data.item_name !== undefined;
    }
    return true;
  },
  { message: 'Either item_id or item_name must be provided when type is item' }
);

// Edit Skill Schema
export const EditSkillSchema = z.object({
  id: z.number().int().positive('Skill ID must be positive').optional(),
  content: z.string().min(1, 'Skill name is required').max(100, 'Name cannot exceed 100 characters').optional(),
  desc: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  icon: z.string().max(10, 'Icon cannot exceed 10 characters').optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be hex format').optional(),
  type: z.number().int().optional(),
  order: z.number().int().optional(),
  status: z.number().int().optional(),
  exp: z.number().int().min(0, 'Experience must be non-negative').optional(),
  delete: z.boolean().optional(),
}).refine(
  (data) => {
    // Creating: content required, id not present
    // Editing: id required
    if (data.id === undefined) {
      return data.content !== undefined;
    }
    return true;
  },
  { message: 'When creating a skill, content (name) is required. When editing, id is required.' }
);

// Export types
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type SearchTasksInput = z.infer<typeof SearchTasksSchema>;
export type TaskHistoryInput = z.infer<typeof TaskHistorySchema>;
export type AchievementMatchInput = z.infer<typeof AchievementMatchSchema>;
export type SearchShopItemsInput = z.infer<typeof SearchShopItemsSchema>;
export type CreateAchievementInput = z.infer<typeof CreateAchievementSchema>;
export type UpdateAchievementInput = z.infer<typeof UpdateAchievementSchema>;
export type DeleteAchievementInput = z.infer<typeof DeleteAchievementSchema>;
export type EditTaskInput = z.infer<typeof EditTaskSchema>;
export type AddShopItemInput = z.infer<typeof AddShopItemSchema>;
export type EditShopItemInput = z.infer<typeof EditShopItemSchema>;
export type ApplyPenaltyInput = z.infer<typeof ApplyPenaltySchema>;
export type EditSkillInput = z.infer<typeof EditSkillSchema>;
