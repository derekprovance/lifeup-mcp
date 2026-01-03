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
  id: number;
  taskId: number;
  taskName: string;
  completedTime: number;
  exp: number;
  coin: number;
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
}

export interface TaskMatchResult {
  achievement: Category; // Using Category since achievement structure may be limited
  confidence: number; // 0-100 confidence score
  matchReasons: string[];
}
