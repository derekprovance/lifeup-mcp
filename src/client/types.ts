/**
 * TypeScript interfaces for LifeUp Cloud API responses
 * Based on lifeup-api.json OpenAPI specification
 */

export interface HttpResponse<T = any> {
  code: number;
  message: string;
  data?: T | null;
}

export interface Task {
  id: number;
  gid: number;
  name: string;
  nameExtended?: string | null;
  content?: string | null;
  notes?: string | null;
  words?: string | null;
  status: number; // 0=active, 1=completed, 2=other
  exp: number;
  coin: number;
  coinVariable: number;
  skill_id?: number | null;
  skillIds: number[];
  itemId?: number | null;
  items: any[];
  subTasks: SubTask[];
  startTime: number;
  deadline?: number | null;
  due_date?: number | null;
  endTime?: number | null;
  remindTime?: number | null;
  created_time: number;
  update_time: number;
  frequency: number; // 0=never, 1=daily, etc.
  categoryId: number;
  order: number;
}

export interface CoinInfo {
  coin?: number;
  balance?: number;
  atm?: number;
  [key: string]: number | undefined;
}

export interface SubTask {
  id: number;
  gid: number;
  todo: string;
  status: number; // 0=incomplete, 1=complete
  remindTime?: number | null;
  exp: number;
  coin: number;
  coinVariable: number;
  items: any[];
  order: number;
  autoUseItem: boolean;
}

export interface Category {
  id: number;
  name: string;
  isAsc: boolean;
  sort?: string | null;
  filter?: string | null;
  order: number;
  status?: number | null;
  type?: number | null;
  desc?: string | null;
  iconUri?: string | null;
}

export interface Achievement {
  id: number;
  name: string;
  description: string;
  category_id: number;
  progress: number;
  target: number;
  is_unlocked: boolean;
  // Optional reward fields
  exp?: number;
  coin?: number;
  coin_var?: number;
  skills?: number[];
  items?: ItemReward[];
  color?: string;
  secret?: boolean;
}

export interface Skill {
  id: number;
  name: string;
  description?: string | null;
  desc?: string | null;
  icon?: string | null;
  level: number;
  experience: number;
  currentLevelExp: number;
  untilNextLevelExp: number;
  next_level_exp: number;
  color?: number | null;
  order: number;
  type: number;
}

export interface Item {
  id: number;
  name: string;
  desc?: string | null;
  icon?: string | null;
  price: number;
  category_id: number;
  stockNumber: number;
  ownNumber: number;
  disablePurchase: boolean;
  maxPurchaseNumber: number;
  order: number;
}

export interface LifeUpInfo {
  version?: string;
  playerName?: string;
  level?: number;
  experience?: number;
  [key: string]: any;
}

export interface TaskHistoryRecord {
  id?: number;
  taskId?: number;
  taskName?: string;
  completedTime?: number;
  time?: number;
  exp: number;
  coin: number;
  coin_var?: number;
  [key: string]: any;
}

export interface CreateTaskRequest {
  name: string;
  exp?: number;
  coin?: number;
  coinVar?: number;
  categoryId?: number;
  deadline?: number;
  skillIds?: number[];
  content?: string;
  auto_use_item?: boolean;
  task_type?: number; // 0=normal, 1=count, 2=negative, 3=API (requires LifeUp v1.99.1+)
  target_times?: number; // Target count for count tasks (required when task_type=1)
  is_affect_shop_reward?: boolean; // Whether count affects shop reward calculation (only valid when task_type=1)
  subtasks?: SubtaskDefinition[]; // Array of subtasks to create with the main task
}

// Task Creation API Response
export interface AddTaskApiResponse {
  task_id: number;
  task_gid: number;
}

// Subtask API Response
export interface SubtaskApiResponse {
  main_task_id: number;
  subtask_id: number;
  subtask_gid: number;
}

// Subtask Batch Operation Result (includes both successes and failures)
export interface SubtaskBatchResult {
  successes: SubtaskApiResponse[];
  failures: Array<{
    subtask: SubtaskDefinition;
    error: string;
  }>;
}

// Subtask Definition for inline creation with create_task
export interface SubtaskDefinition {
  todo: string; // Required: subtask content
  remind_time?: number;
  order?: number;
  coin?: number;
  coin_var?: number;
  exp?: number;
  auto_use_item?: boolean;
  item_id?: number;
  item_name?: string;
  item_amount?: number;
  items?: ItemReward[];
}

// Create Subtask Request (standalone tool)
export interface CreateSubtaskRequest {
  // Parent task identification (at least one required)
  main_id?: number;
  main_gid?: number;
  main_name?: string;

  // Subtask content (required)
  todo: string;

  // Optional fields
  remind_time?: number;
  order?: number;
  coin?: number;
  coin_var?: number;
  exp?: number;
  auto_use_item?: boolean;

  // Item rewards
  item_id?: number;
  item_name?: string;
  item_amount?: number;
  items?: ItemReward[];
}

// Edit Subtask Request (standalone tool)
export interface EditSubtaskRequest {
  // Parent task identification (at least one required)
  main_id?: number;
  main_gid?: number;
  main_name?: string;

  // Subtask identification for editing (at least one required)
  edit_id?: number;
  edit_gid?: number;
  edit_name?: string;

  // Fields to update
  todo?: string;
  remind_time?: number;
  order?: number;
  coin?: number;
  coin_var?: number;
  exp?: number;
  coin_set_type?: 'absolute' | 'relative';
  exp_set_type?: 'absolute' | 'relative';
  auto_use_item?: boolean;

  // Item rewards
  item_id?: number;
  item_name?: string;
  item_amount?: number;
  items?: ItemReward[];
}

export interface TaskMatchResult {
  achievement: Category; // Using Category since achievement structure may be limited
  confidence: number; // 0-100 confidence score
  matchReasons: string[];
}

export interface AchievementCondition {
  type: number;
  related_id?: number | null;
  target: number;
}

export interface ItemReward {
  item_id: number;
  amount: number;
}

export interface CreateAchievementRequest {
  name: string;
  category_id: number;
  desc?: string;
  conditions_json?: AchievementCondition[];
  exp?: number;
  coin?: number;
  coin_var?: number;
  skills?: number[];
  items?: ItemReward[];
  item_id?: number;
  item_amount?: number;
  secret?: boolean;
  color?: string;
  unlocked?: boolean;
  write_feeling?: boolean;
}

export interface UpdateAchievementRequest {
  edit_id: number;
  name?: string;
  category_id?: number;
  desc?: string;
  conditions_json?: AchievementCondition[];
  exp?: number;
  coin?: number;
  coin_var?: number;
  coin_set_type?: 'absolute' | 'relative';
  exp_set_type?: 'absolute' | 'relative';
  skills?: number[];
  items?: ItemReward[];
  item_id?: number;
  item_amount?: number;
  secret?: boolean;
  color?: string;
  unlocked?: boolean;
}

export interface DeleteAchievementRequest {
  edit_id: number;
}

// Edit Task
export interface EditTaskRequest {
  id?: number;
  gid?: number;
  name?: string;
  todo?: string;
  notes?: string;
  coin?: number;
  coin_var?: number;
  exp?: number;
  exp_set_type?: 'absolute' | 'relative';
  coin_set_type?: 'absolute' | 'relative';
  skills?: number[];
  category?: number;
  frequency?: number;
  deadline?: number;
  remind_time?: number;
  start_time?: number;
  color?: string;
  background_url?: string;
  background_alpha?: number;
  enable_outline?: boolean;
  use_light_remark_text_color?: boolean;
  item_id?: number;
  item_name?: string;
  item_amount?: number;
  items?: ItemReward[];
  auto_use_item?: boolean;
  frozen?: boolean;
  task_type?: number; // 0=normal, 1=count, 2=negative, 3=API
  target_times?: number; // Target count for count tasks (required when task_type=1)
  is_affect_shop_reward?: boolean; // Whether count affects shop reward calculation (only valid when task_type=1)
}

// Delete Task
export interface DeleteTaskRequest {
  id: number;
}

// Shop Item Common
export interface ItemEffect {
  type: number;
  info?: any;
}

export interface PurchaseLimit {
  type: 'daily' | 'total';
  value: number;
}

// Add Shop Item
export interface AddShopItemRequest {
  name: string;
  desc?: string;
  icon?: string;
  title_color_string?: string;
  price?: number;
  stock_number?: number;
  action_text?: string;
  disable_purchase?: boolean;
  disable_use?: boolean;
  category?: number;
  order?: number;
  purchase_limit?: PurchaseLimit[];
  effects?: ItemEffect[];
  own_number?: number;
  unlist?: boolean;
}

// Edit Shop Item
export interface EditShopItemRequest {
  id?: number;
  name?: string;
  set_name?: string;
  set_desc?: string;
  set_icon?: string;
  set_price?: number;
  set_price_type?: 'absolute' | 'relative';
  own_number?: number;
  own_number_type?: 'absolute' | 'relative';
  stock_number?: number;
  stock_number_type?: 'absolute' | 'relative';
  disable_purchase?: boolean;
  disable_use?: boolean;
  action_text?: string;
  title_color_string?: string;
  effects?: ItemEffect[];
  purchase_limit?: PurchaseLimit[];
  category_id?: number;
  order?: number;
  unlist?: boolean;
}

// Apply Penalty
export interface ApplyPenaltyRequest {
  type: 'coin' | 'exp' | 'item';
  content: string;
  number: number;
  skills?: number[];
  item_id?: number;
  item_name?: string;
  silent?: boolean;
}

// Edit Skill
export interface EditSkillRequest {
  id?: number;
  content?: string;
  desc?: string;
  icon?: string;
  color?: string;
  type?: number;
  order?: number;
  status?: number;
  exp?: number;
  delete?: boolean;
}
