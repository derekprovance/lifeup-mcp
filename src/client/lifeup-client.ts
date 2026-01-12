/**
 * LifeUp Cloud API HTTP Client
 * Handles all communication with the LifeUp server
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { configManager, ConfigManager } from '../config/config.js';
import { ErrorHandler, LifeUpError } from '../error/error-handler.js';
import { API_ENDPOINTS, RESPONSE_CODE, LIFEUP_URL_SCHEMES } from './constants.js';
import * as Types from './types.js';

export class LifeUpClient {
  private axiosInstance: AxiosInstance;
  private configManager: ConfigManager;
  private tasksCache: {
    data: Types.Task[];
    timestamp: number;
  } | null = null;
  private readonly TASKS_CACHE_TTL_MS = 5000; // 5 second cache for task list

  // Telemetry for tracking fallback usage and performance
  private telemetry = {
    taskCreations: 0,
    taskIdExtractions: 0,
    fallbackLookups: 0,
    raceconditionDetections: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };

  constructor(config?: ConfigManager, axiosInstance?: AxiosInstance) {
    this.configManager = config || configManager;

    if (axiosInstance) {
      this.axiosInstance = axiosInstance;
    } else {
      const cfg = this.configManager.getConfig();
      this.axiosInstance = axios.create({
        baseURL: cfg.baseUrl,
        timeout: cfg.timeout,
        headers: this.buildHeaders(),
      });
    }
  }

  /**
   * Factory method for creating LifeUpClient instances with custom dependencies
   * Useful for testing where you want to inject mock dependencies
   */
  static create(config?: ConfigManager, axiosInstance?: AxiosInstance): LifeUpClient {
    return new LifeUpClient(config, axiosInstance);
  }

  /**
   * Clear the task cache to force fresh fetch on next call
   * Used internally after task creation operations
   */
  private clearTasksCache(): void {
    if (this.tasksCache) {
      this.configManager.logIfDebug('Clearing task cache after mutation');
      this.tasksCache = null;
    }
  }

  /**
   * Get telemetry data for debugging and monitoring
   * Returns statistics on task creation, cache usage, and fallback operations
   */
  getTelemetry(): typeof this.telemetry {
    return { ...this.telemetry };
  }

  /**
   * Reset telemetry counters (useful for testing)
   */
  resetTelemetry(): void {
    this.telemetry = {
      taskCreations: 0,
      taskIdExtractions: 0,
      fallbackLookups: 0,
      raceconditionDetections: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = this.configManager.getApiToken();
    if (token) {
      headers['Authorization'] = token;
    }

    return headers;
  }

  /**
   * Check if the server is reachable
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get('/');
      return response.status === 200;
    } catch (error) {
      this.configManager.logIfDebug('Health check failed', error);
      return false;
    }
  }

  /**
   * Create a task via lifeup:// URL scheme
   * If subtasks are provided, creates the main task first, then creates subtasks sequentially.
   *
   * @param request - Task creation request with optional subtasks array (max 50 subtasks recommended)
   * @returns Object containing the created task and batch subtask results
   *
   * @remarks
   * - Attempts to extract task ID from API response first (handles both snake_case and camelCase)
   * - Falls back to name-based lookup if ID not found in response
   * - Subtasks are created sequentially to preserve order with 50ms rate limiting between each
   * - Partial success is allowed - some subtasks may fail while others succeed
   * - For tasks with >50 subtasks, consider breaking into multiple operations
   *
   * @throws {LifeUpError} If task creation fails or server is unreachable
   *
   * @example
   * ```typescript
   * const result = await lifeupClient.createTask({
   *   name: 'Weekly Review',
   *   exp: 100,
   *   subtasks: [
   *     { todo: 'Check email', exp: 10 },
   *     { todo: 'Update tasks', exp: 20 }
   *   ]
   * });
   * console.log(result.task?.id); // Main task ID
   * console.log(result.subtaskBatchResult?.successes); // Successfully created subtasks
   * console.log(result.subtaskBatchResult?.failures); // Any failed subtasks
   * ```
   */
  async createTask(
    request: Types.CreateTaskRequest
  ): Promise<{ task: Types.Task | null; subtaskBatchResult?: Types.SubtaskBatchResult }> {
    // First create the main task
    const taskResult = await this.executeUrlSchemeOperation(
      () => {
        const url = this.buildTaskUrl(request);
        this.configManager.logIfDebug('Creating task with URL:', url);
        return url;
      },
      'create task',
      (response: Types.HttpResponse) => {
        // Extract task ID from API response data
        // Handle both snake_case (task_id) and camelCase (taskId) for robustness
        if (response.data && typeof response.data === 'object') {
          const responseData = response.data as any;
          const taskId = responseData.task_id ?? responseData.taskId;
          const taskGid = responseData.task_gid ?? responseData.taskGid;

          if (taskId) {
            // Track successful ID extraction in telemetry
            this.telemetry.taskIdExtractions++;
            this.configManager.logIfDebug(
              `Task created with ID: ${taskId}, GID: ${taskGid ?? 'N/A'}`
            );
            return {
              ...request,
              id: taskId,
              gid: taskGid ?? taskId,
            } as Types.Task;
          }

          // Log the actual response structure for debugging if ID is missing
          this.configManager.logIfDebug(
            'Task ID not found in expected fields. Response structure:',
            {
              dataKeys: Object.keys(responseData),
              data: JSON.stringify(responseData).substring(0, 200),
            }
          );
        }

        // If response doesn't include task ID, return null to trigger fallback
        this.configManager.logIfDebug('Task ID not found in response, will use fallback lookup');
        return null;
      }
    );

    // If subtasks were provided and we have a task ID, create them
    let subtaskBatchResult: Types.SubtaskBatchResult | undefined;
    if (request.subtasks && request.subtasks.length > 0) {
      // Warn if attempting to create a large number of subtasks
      const SUBTASK_BATCH_THRESHOLD = 50;
      if (request.subtasks.length > SUBTASK_BATCH_THRESHOLD) {
        this.configManager.logIfDebug(
          `WARNING: Attempting to create ${request.subtasks.length} subtasks. ` +
            `This may take a while due to sequential processing (approximately ${request.subtasks.length * 100}ms). ` +
            `Consider breaking this into multiple operations for better reliability.`
        );
      }
      // We need the task ID to create subtasks
      // The API response should include task_id or we need to fetch it by name
      let taskId: number | null = null;

      if (taskResult && typeof taskResult === 'object' && 'id' in taskResult && taskResult.id) {
        taskId = taskResult.id;
      } else {
        // Fallback: search for task by name, using most recent match
        // Track fallback usage in telemetry
        this.telemetry.fallbackLookups++;

        this.configManager.logIfDebug('Task ID not in response, fetching by name:', request.name);
        const tasks = await this.getAllTasks();

        // Sort by created_time descending and filter by exact name match
        const matchingTasks = tasks
          .filter((t) => t.name === request.name)
          .sort((a, b) => b.created_time - a.created_time);

        if (matchingTasks.length > 0) {
          // Use the most recent task (should be the one we just created)
          const selectedTask = matchingTasks[0];
          taskId = selectedTask.id;

          if (matchingTasks.length > 1) {
            // Check if multiple recent tasks exist (within 5 seconds)
            // This indicates a potential race condition
            const recentTasks = matchingTasks.filter(
              (t) => selectedTask.created_time - t.created_time < 5000
            );

            if (recentTasks.length > 1) {
              // Track race condition detection in telemetry
              this.telemetry.raceconditionDetections++;

              this.configManager.logIfDebug(
                `CRITICAL WARNING: ${recentTasks.length} tasks with name "${request.name}" created within 5 seconds. ` +
                  `Using most recent (ID: ${taskId}, created: ${new Date(selectedTask.created_time).toISOString()}). ` +
                  `Subtasks may be attached to the wrong task. ` +
                  `Consider using unique task names or request task ID extraction via API.`
              );
            } else {
              this.configManager.logIfDebug(
                `Warning: Multiple tasks with name "${request.name}" found (${matchingTasks.length} total). ` +
                  `Using most recent (ID: ${taskId}, created: ${new Date(selectedTask.created_time).toISOString()})`
              );
            }
          } else {
            this.configManager.logIfDebug(`Found task by name: ID ${taskId}`);
          }
        } else {
          this.configManager.logIfDebug(`No task found with name: "${request.name}"`);
        }
      }

      if (taskId) {
        this.configManager.logIfDebug(
          `Creating ${request.subtasks.length} subtasks for task ${taskId}`
        );
        subtaskBatchResult = await this.createSubtasksBatch(taskId, request.subtasks);
      } else {
        this.configManager.logIfDebug('Could not determine task ID for subtask creation');
      }
    }

    // Clear the task cache since we just created/modified tasks
    if (taskResult) {
      this.clearTasksCache();
    }

    return {
      task: taskResult,
      subtaskBatchResult,
    };
  }

  /**
   * Build lifeup:// URL for task creation
   */
  private buildTaskUrl(request: Types.CreateTaskRequest): string {
    // Validate string inputs for security
    this.validateStringInput(request.name, 'task name');
    this.validateStringInput(request.content, 'task content');

    const params = new URLSearchParams();

    // Required field
    params.append('todo', request.name);

    // Numeric fields
    this.appendIfDefined(params, 'exp', request.exp);
    this.appendIfDefined(params, 'coin', request.coin);
    this.appendIfDefined(params, 'coin_var', request.coinVar);
    this.appendIfDefined(params, 'category', request.categoryId);
    this.appendIfDefined(params, 'deadline', request.deadline);
    this.appendIfDefined(params, 'frequency', request.frequency);

    // String field
    this.appendIfDefined(params, 'notes', request.content);

    // Array field
    this.appendArray(params, 'skills', request.skillIds);

    // Boolean flags
    this.appendIfDefined(params, 'auto_use_item', request.auto_use_item, (val) => String(val));

    // Count task parameters
    this.appendIfDefined(params, 'task_type', request.task_type);
    this.appendIfDefined(params, 'target_times', request.target_times);
    this.appendIfDefined(params, 'is_affect_shop_reward', request.is_affect_shop_reward, (val) =>
      String(val)
    );

    return this.buildFinalUrl(LIFEUP_URL_SCHEMES.TASK_CREATE, params);
  }

  /**
   * Execute a URL scheme via the API gateway
   */
  private async executeUrlScheme(url: string): Promise<Types.HttpResponse> {
    try {
      this.configManager.logIfDebug(`Executing URL scheme via ${API_ENDPOINTS.API_GATEWAY}`, {
        url,
      });
      const response = await this.axiosInstance.post(API_ENDPOINTS.API_GATEWAY, { urls: [url] });
      this.configManager.logIfDebug(`URL scheme response:`, response.data);
      return response.data;
    } catch (error) {
      this.configManager.logIfDebug(
        `URL scheme error:`,
        error instanceof AxiosError ? error.message : error
      );
      if (error instanceof AxiosError) {
        throw ErrorHandler.handleNetworkError(error);
      }
      throw error;
    }
  }

  /**
   * Execute a URL scheme operation and handle errors uniformly
   * Wraps the URL scheme, error handling, and response validation
   */
  private async executeUrlSchemeOperation<T = any>(
    buildUrl: () => string,
    operation: string,
    validateResponse: (response: Types.HttpResponse) => T
  ): Promise<T> {
    try {
      const url = buildUrl();
      const response = await this.executeUrlScheme(url);

      if (response.code === RESPONSE_CODE.SUCCESS) {
        return validateResponse(response);
      }

      throw new LifeUpError(
        `Failed to ${operation}: ${response.message}`,
        `${operation.toUpperCase().replace(/ /g, '_')}_FAILED`,
        `Could not ${operation}: ${response.message}`,
        false
      );
    } catch (error) {
      if (error instanceof LifeUpError) {
        throw error;
      }

      if (error instanceof AxiosError) {
        throw ErrorHandler.handleNetworkError(error);
      }

      throw new LifeUpError(
        `Unexpected error during ${operation}: ${(error as Error).message}`,
        'UNKNOWN_ERROR',
        `An unexpected error occurred while ${operation}.`,
        false
      );
    }
  }

  /**
   * Get all tasks
   */
  async getAllTasks(): Promise<Types.Task[]> {
    // Check if cache is still valid (within 5 seconds)
    if (this.tasksCache) {
      const cacheAge = Date.now() - this.tasksCache.timestamp;
      if (cacheAge < this.TASKS_CACHE_TTL_MS) {
        // Track cache hit in telemetry
        this.telemetry.cacheHits++;

        this.configManager.logIfDebug(
          `Using cached task list (${cacheAge}ms old, ${this.tasksCache.data.length} tasks)`
        );
        return this.tasksCache.data;
      }
    }

    // Cache miss or expired
    this.telemetry.cacheMisses++;

    try {
      const response = await this.axiosInstance.get<Types.HttpResponse<Types.Task[]>>(
        API_ENDPOINTS.TASKS
      );

      if (response.data.code === RESPONSE_CODE.SUCCESS && Array.isArray(response.data.data)) {
        // Cache the result
        this.tasksCache = {
          data: response.data.data,
          timestamp: Date.now(),
        };
        this.configManager.logIfDebug(
          `Fetched and cached ${response.data.data.length} tasks`
        );
        return response.data.data;
      }

      throw new LifeUpError(
        `Failed to fetch tasks: ${response.data.message}`,
        'FETCH_TASKS_FAILED',
        `Could not fetch tasks: ${response.data.message}`,
        false
      );
    } catch (error) {
      if (error instanceof LifeUpError) {
        throw error;
      }

      if (error instanceof AxiosError) {
        throw ErrorHandler.handleNetworkError(error);
      }

      throw new LifeUpError(
        `Error fetching tasks: ${(error as Error).message}`,
        'FETCH_ERROR',
        `An error occurred while fetching tasks.`,
        false
      );
    }
  }

  /**
   * Get tasks in a specific category
   */
  async getTasksByCategory(categoryId: number): Promise<Types.Task[]> {
    try {
      const response = await this.axiosInstance.get<Types.HttpResponse<Types.Task[]>>(
        API_ENDPOINTS.TASKS_BY_CATEGORY(categoryId)
      );

      if (response.data.code === RESPONSE_CODE.SUCCESS && Array.isArray(response.data.data)) {
        return response.data.data;
      }

      return [];
    } catch (error) {
      if (error instanceof AxiosError) {
        throw ErrorHandler.handleNetworkError(error);
      }
      throw error;
    }
  }

  /**
   * Get task categories
   */
  async getTaskCategories(): Promise<Types.Category[]> {
    try {
      const response = await this.axiosInstance.get<Types.HttpResponse<Types.Category[]>>(
        API_ENDPOINTS.TASK_CATEGORIES
      );

      if (response.data.code === RESPONSE_CODE.SUCCESS && Array.isArray(response.data.data)) {
        return response.data.data;
      }

      return [];
    } catch (error) {
      if (error instanceof AxiosError) {
        throw ErrorHandler.handleNetworkError(error);
      }
      throw error;
    }
  }

  /**
   * Get task history
   */
  async getTaskHistory(offset = 0, limit = 100): Promise<Types.TaskHistoryRecord[]> {
    try {
      const response = await this.axiosInstance.get<Types.HttpResponse<Types.TaskHistoryRecord[]>>(
        API_ENDPOINTS.HISTORY,
        {
          params: { offset, limit },
        }
      );

      if (response.data.code === RESPONSE_CODE.SUCCESS && Array.isArray(response.data.data)) {
        return response.data.data;
      }

      return [];
    } catch (error) {
      if (error instanceof AxiosError) {
        throw ErrorHandler.handleNetworkError(error);
      }
      throw error;
    }
  }

  /**
   * Get achievement categories
   */
  async getAchievementCategories(): Promise<Types.Category[]> {
    try {
      const response = await this.axiosInstance.get<Types.HttpResponse<Types.Category[]>>(
        API_ENDPOINTS.ACHIEVEMENT_CATEGORIES
      );

      if (response.data.code === RESPONSE_CODE.SUCCESS && Array.isArray(response.data.data)) {
        return response.data.data;
      }

      return [];
    } catch (error) {
      if (error instanceof AxiosError) {
        throw ErrorHandler.handleNetworkError(error);
      }
      throw error;
    }
  }

  /**
   * Get achievements in a specific category
   * @param categoryId - The achievement category ID
   * @returns Array of achievements, or empty array if fetch fails
   */
  private async getAchievementsByCategory(categoryId: number): Promise<Types.Achievement[]> {
    try {
      const response = await this.axiosInstance.get<Types.HttpResponse<Types.Achievement[]>>(
        API_ENDPOINTS.ACHIEVEMENTS_BY_CATEGORY(categoryId)
      );

      if (response.data.code === RESPONSE_CODE.SUCCESS && Array.isArray(response.data.data)) {
        return response.data.data;
      }

      return [];
    } catch (error) {
      // Gracefully handle per-category failures - don't block entire operation
      this.configManager.logIfDebug(
        `Failed to fetch achievements for category ${categoryId}:`,
        error
      );
      return [];
    }
  }

  /**
   * Get all achievements by fetching from all categories
   * Note: This makes N+1 requests where N is the number of achievement categories
   * Returns null if categories are unavailable (triggers fallback to showing categories)
   */
  async getAchievements(): Promise<Types.Achievement[] | null> {
    try {
      this.configManager.logIfDebug('Fetching achievements from all categories');

      // Step 1: Get all achievement categories
      const categories = await this.getAchievementCategories();

      if (categories.length === 0) {
        this.configManager.logIfDebug('No achievement categories found');
        return null;
      }

      this.configManager.logIfDebug(`Found ${categories.length} achievement categories`);

      // Step 2: Fetch achievements from all categories in parallel
      const achievementPromises = categories.map((category) =>
        this.getAchievementsByCategory(category.id)
      );

      const achievementArrays = await Promise.all(achievementPromises);

      // Step 3: Flatten and combine all achievements
      const allAchievements = achievementArrays.flat();

      this.configManager.logIfDebug(
        `Fetched ${allAchievements.length} total achievements from ${categories.length} categories`
      );

      return allAchievements.length > 0 ? allAchievements : null;
    } catch (error) {
      if (error instanceof AxiosError) {
        const lifeupError = ErrorHandler.handleApiError(error, 'getAchievements');
        this.configManager.logIfDebug('Achievement fetch error:', lifeupError.message);
        return null; // Graceful fallback
      }
      return null;
    }
  }

  /**
   * Get LifeUp info
   */
  async getInfo(): Promise<Types.LifeUpInfo | null> {
    try {
      const response = await this.axiosInstance.get<Types.HttpResponse<Types.LifeUpInfo>>(
        API_ENDPOINTS.INFO
      );

      if (response.data.code === RESPONSE_CODE.SUCCESS) {
        return response.data.data || {};
      }

      return null;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw ErrorHandler.handleNetworkError(error);
      }
      return null;
    }
  }

  /**
   * Get coin information
   */
  async getCoinInfo(): Promise<Types.CoinInfo | number | null> {
    try {
      const response = await this.axiosInstance.get<Types.HttpResponse<Types.CoinInfo | number>>(
        API_ENDPOINTS.COIN
      );

      if (response.data.code === RESPONSE_CODE.SUCCESS) {
        return response.data.data || null;
      }

      return null;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw ErrorHandler.handleNetworkError(error);
      }
      return null;
    }
  }

  /**
   * Get all skills
   */
  async getSkills(): Promise<Types.Skill[]> {
    try {
      const response = await this.axiosInstance.get<Types.HttpResponse<Types.Skill[]>>(
        API_ENDPOINTS.SKILLS
      );

      if (response.data.code === RESPONSE_CODE.SUCCESS && Array.isArray(response.data.data)) {
        return response.data.data;
      }

      return [];
    } catch (error) {
      if (error instanceof AxiosError) {
        throw ErrorHandler.handleNetworkError(error);
      }
      return [];
    }
  }

  /**
   * Get all shop items
   */
  async getShopItems(): Promise<Types.Item[]> {
    try {
      const response = await this.axiosInstance.get<Types.HttpResponse<Types.Item[]>>(
        API_ENDPOINTS.ITEMS
      );

      if (response.data.code === RESPONSE_CODE.SUCCESS && Array.isArray(response.data.data)) {
        return response.data.data;
      }

      return [];
    } catch (error) {
      if (error instanceof AxiosError) {
        throw ErrorHandler.handleNetworkError(error);
      }
      return [];
    }
  }

  /**
   * Get shop item categories
   */
  async getItemCategories(): Promise<Types.Category[]> {
    try {
      const response = await this.axiosInstance.get<Types.HttpResponse<Types.Category[]>>(
        API_ENDPOINTS.ITEM_CATEGORIES
      );

      if (response.data.code === RESPONSE_CODE.SUCCESS && Array.isArray(response.data.data)) {
        return response.data.data;
      }

      return [];
    } catch (error) {
      if (error instanceof AxiosError) {
        throw ErrorHandler.handleNetworkError(error);
      }
      return [];
    }
  }

  /**
   * Create a new achievement
   */
  async createAchievement(request: Types.CreateAchievementRequest): Promise<Types.HttpResponse> {
    return this.executeUrlSchemeOperation(
      () => this.buildAchievementUrl(request),
      'create achievement',
      (response) => response
    );
  }

  /**
   * Update an existing achievement
   */
  async updateAchievement(request: Types.UpdateAchievementRequest): Promise<Types.HttpResponse> {
    return this.executeUrlSchemeOperation(
      () => {
        const url = this.buildAchievementUrl(request);
        this.configManager.logIfDebug('Updating achievement with URL:', url);
        return url;
      },
      'update achievement',
      (response) => {
        this.configManager.logIfDebug('Update achievement response:', response);
        return response;
      }
    );
  }

  /**
   * Delete an achievement
   */
  async deleteAchievement(request: Types.DeleteAchievementRequest): Promise<Types.HttpResponse> {
    return this.executeUrlSchemeOperation(
      () => this.buildAchievementDeleteUrl(request),
      'delete achievement',
      (response) => response
    );
  }

  /**
   * Build achievement URL for create/update operations
   */
  private buildAchievementUrl(
    request: Types.CreateAchievementRequest | Types.UpdateAchievementRequest
  ): string {
    // Validate string inputs for security
    this.validateStringInput(request.name, 'achievement name');
    this.validateStringInput(request.desc, 'achievement description');

    const params = new URLSearchParams();

    // Edit mode if edit_id present
    if ('edit_id' in request && request.edit_id) {
      this.appendIfDefined(params, 'edit_id', request.edit_id);
    }

    // Required for create, optional for update
    this.appendIfDefined(params, 'name', request.name);
    this.appendIfDefined(params, 'category_id', request.category_id);

    // Optional fields
    this.appendIfDefined(params, 'desc', request.desc);
    this.appendIfDefined(params, 'exp', request.exp);
    this.appendIfDefined(params, 'coin', request.coin);
    this.appendIfDefined(params, 'coin_var', request.coin_var);

    // Set types (update only)
    if ('coin_set_type' in request) {
      this.appendIfDefined(params, 'coin_set_type', request.coin_set_type);
    }
    if ('exp_set_type' in request) {
      this.appendIfDefined(params, 'exp_set_type', request.exp_set_type);
    }

    // Conditions JSON
    if (request.conditions_json && request.conditions_json.length > 0) {
      this.appendIfDefined(params, 'conditions_json', request.conditions_json, (val) =>
        JSON.stringify(val)
      );
    }

    // Skills array
    this.appendArray(params, 'skills', request.skills);

    // Items JSON array
    if (request.items && request.items.length > 0) {
      this.appendIfDefined(params, 'items', request.items, (val) => JSON.stringify(val));
    }

    // Single item reward
    this.appendIfDefined(params, 'item_id', request.item_id);
    this.appendIfDefined(params, 'item_amount', request.item_amount);

    // Boolean flags
    this.appendIfDefined(params, 'secret', request.secret, (val) => (val ? 'true' : 'false'));
    this.appendIfDefined(params, 'unlocked', request.unlocked, (val) => (val ? 'true' : 'false'));
    if ('write_feeling' in request) {
      this.appendIfDefined(params, 'write_feeling', request.write_feeling, (val) =>
        val ? 'true' : 'false'
      );
    }

    // Color
    this.appendIfDefined(params, 'color', request.color);

    return this.buildFinalUrl(LIFEUP_URL_SCHEMES.ACHIEVEMENT, params);
  }

  /**
   * Build achievement delete URL
   */
  private buildAchievementDeleteUrl(request: Types.DeleteAchievementRequest): string {
    const params = new URLSearchParams();
    this.appendIfDefined(params, 'edit_id', request.edit_id);
    this.appendIfDefined(params, 'delete', true, (val) => (val ? 'true' : 'false'));
    return this.buildFinalUrl(LIFEUP_URL_SCHEMES.ACHIEVEMENT, params);
  }

  /**
   * Edit an existing task
   */
  async editTask(request: Types.EditTaskRequest): Promise<Types.HttpResponse> {
    return this.executeUrlSchemeOperation(
      () => this.buildEditTaskUrl(request),
      'edit task',
      (response) => response
    );
  }

  /**
   * Delete an existing task
   */
  async deleteTask(request: Types.DeleteTaskRequest): Promise<Types.HttpResponse> {
    return this.executeUrlSchemeOperation(
      () => this.buildTaskDeleteUrl(request),
      'delete task',
      (response) => response
    );
  }

  /**
   * Add a new shop item
   */
  async addShopItem(request: Types.AddShopItemRequest): Promise<Types.HttpResponse> {
    return this.executeUrlSchemeOperation(
      () => this.buildAddShopItemUrl(request),
      'add shop item',
      (response) => response
    );
  }

  /**
   * Edit an existing shop item
   */
  async editShopItem(request: Types.EditShopItemRequest): Promise<Types.HttpResponse> {
    return this.executeUrlSchemeOperation(
      () => this.buildEditShopItemUrl(request),
      'edit shop item',
      (response) => response
    );
  }

  /**
   * Apply a penalty
   */
  async applyPenalty(request: Types.ApplyPenaltyRequest): Promise<Types.HttpResponse> {
    return this.executeUrlSchemeOperation(
      () => this.buildPenaltyUrl(request),
      'apply penalty',
      (response) => response
    );
  }

  /**
   * Edit a skill
   */
  async editSkill(request: Types.EditSkillRequest): Promise<Types.HttpResponse> {
    return this.executeUrlSchemeOperation(
      () => this.buildEditSkillUrl(request),
      'edit skill',
      (response) => response
    );
  }

  /**
   * Helper to append a field to URLSearchParams if defined
   */
  private appendIfDefined<T>(
    params: URLSearchParams,
    key: string,
    value: T | undefined,
    formatter?: (val: T) => string
  ): void {
    if (value !== undefined) {
      const stringValue = formatter ? formatter(value) : String(value);
      params.append(key, stringValue);
    }
  }

  /**
   * Helper to append array values (for multi-value parameters like skills)
   */
  private appendArray<T>(params: URLSearchParams, key: string, values: T[] | undefined): void {
    if (values && values.length > 0) {
      values.forEach((val) => {
        params.append(key, String(val));
      });
    }
  }

  /**
   * Helper to build final URL with proper encoding
   */
  private buildFinalUrl(scheme: string, params: URLSearchParams): string {
    return `${scheme}?${params.toString().replace(/\+/g, '%20')}`;
  }

  /**
   * Validate string inputs to prevent URL injection
   * While URLSearchParams handles encoding, this provides defense-in-depth
   */
  private validateStringInput(value: string | undefined, fieldName: string): void {
    if (!value) return;

    // Check for suspicious patterns that might indicate attempted injection
    // URLSearchParams will encode these, but we validate as a security measure
    if (!/^[\w\s\-.,;:!?()@'\\/]*$/.test(value)) {
      // Allow common punctuation but flag anything that looks suspicious
      this.configManager.logIfDebug(
        `String input contains unusual characters in ${fieldName}: ${value}`
      );
    }
  }

  /**
   * Build edit task URL
   */
  private buildEditTaskUrl(request: Types.EditTaskRequest): string {
    // Validate string inputs for security
    this.validateStringInput(request.name, 'task name');
    this.validateStringInput(request.todo, 'task description');
    this.validateStringInput(request.notes, 'task notes');

    const params = new URLSearchParams();

    // Task identifiers (at least one required)
    this.appendIfDefined(params, 'id', request.id);
    this.appendIfDefined(params, 'gid', request.gid);
    this.appendIfDefined(params, 'name', request.name);

    // Task properties
    this.appendIfDefined(params, 'todo', request.todo);
    this.appendIfDefined(params, 'notes', request.notes);
    this.appendIfDefined(params, 'coin', request.coin);
    this.appendIfDefined(params, 'coin_var', request.coin_var);
    this.appendIfDefined(params, 'exp', request.exp);
    this.appendIfDefined(params, 'exp_set_type', request.exp_set_type);
    this.appendIfDefined(params, 'coin_set_type', request.coin_set_type);

    // Skills array
    this.appendArray(params, 'skills', request.skills);

    // Other properties
    this.appendIfDefined(params, 'category', request.category);
    this.appendIfDefined(params, 'frequency', request.frequency);
    this.appendIfDefined(params, 'deadline', request.deadline);
    this.appendIfDefined(params, 'remind_time', request.remind_time);
    this.appendIfDefined(params, 'start_time', request.start_time);

    // Color encoding
    this.appendIfDefined(params, 'color', request.color);

    // Background settings
    this.appendIfDefined(params, 'background_url', request.background_url);
    this.appendIfDefined(params, 'background_alpha', request.background_alpha);
    this.appendIfDefined(params, 'enable_outline', request.enable_outline, (val) =>
      val ? 'true' : 'false'
    );
    this.appendIfDefined(
      params,
      'use_light_remark_text_color',
      request.use_light_remark_text_color,
      (val) => (val ? 'true' : 'false')
    );

    // Item rewards
    this.appendIfDefined(params, 'item_id', request.item_id);
    this.appendIfDefined(params, 'item_name', request.item_name);
    this.appendIfDefined(params, 'item_amount', request.item_amount);
    this.appendIfDefined(params, 'items', request.items, (val) => JSON.stringify(val));

    // Other flags
    this.appendIfDefined(params, 'auto_use_item', request.auto_use_item, (val) =>
      val ? 'true' : 'false'
    );
    this.appendIfDefined(params, 'frozen', request.frozen, (val) => (val ? 'true' : 'false'));

    // Count task parameters
    this.appendIfDefined(params, 'task_type', request.task_type);
    this.appendIfDefined(params, 'target_times', request.target_times);
    this.appendIfDefined(params, 'is_affect_shop_reward', request.is_affect_shop_reward, (val) =>
      val ? 'true' : 'false'
    );

    return this.buildFinalUrl(LIFEUP_URL_SCHEMES.TASK_EDIT, params);
  }

  /**
   * Build delete task URL
   */
  private buildTaskDeleteUrl(request: Types.DeleteTaskRequest): string {
    const params = new URLSearchParams();
    params.append('id', String(request.id));
    return this.buildFinalUrl(LIFEUP_URL_SCHEMES.TASK_DELETE, params);
  }

  /**
   * Build add shop item URL
   */
  private buildAddShopItemUrl(request: Types.AddShopItemRequest): string {
    // Validate string inputs for security
    this.validateStringInput(request.name, 'item name');
    this.validateStringInput(request.desc, 'item description');
    this.validateStringInput(request.action_text, 'action text');

    const params = new URLSearchParams();

    // Required
    params.append('name', request.name);

    // Optional properties
    this.appendIfDefined(params, 'desc', request.desc);
    this.appendIfDefined(params, 'icon', request.icon);
    this.appendIfDefined(params, 'title_color_string', request.title_color_string);
    this.appendIfDefined(params, 'price', request.price);
    this.appendIfDefined(params, 'stock_number', request.stock_number);
    this.appendIfDefined(params, 'action_text', request.action_text);
    this.appendIfDefined(params, 'disable_purchase', request.disable_purchase, (val) =>
      val ? 'true' : 'false'
    );
    this.appendIfDefined(params, 'disable_use', request.disable_use, (val) =>
      val ? 'true' : 'false'
    );
    this.appendIfDefined(params, 'category', request.category);
    this.appendIfDefined(params, 'order', request.order);

    // JSON parameters
    this.appendIfDefined(params, 'purchase_limit', request.purchase_limit, (val) =>
      JSON.stringify(val)
    );
    this.appendIfDefined(params, 'effects', request.effects, (val) => JSON.stringify(val));

    this.appendIfDefined(params, 'own_number', request.own_number);
    this.appendIfDefined(params, 'unlist', request.unlist, (val) => (val ? 'true' : 'false'));

    return this.buildFinalUrl(LIFEUP_URL_SCHEMES.ITEM_CREATE, params);
  }

  /**
   * Build edit shop item URL
   */
  private buildEditShopItemUrl(request: Types.EditShopItemRequest): string {
    // Validate string inputs for security
    this.validateStringInput(request.name, 'item name');
    this.validateStringInput(request.set_name, 'item name');
    this.validateStringInput(request.set_desc, 'item description');
    this.validateStringInput(request.action_text, 'action text');

    const params = new URLSearchParams();

    // Identifiers
    this.appendIfDefined(params, 'id', request.id);
    this.appendIfDefined(params, 'name', request.name);

    // Set properties
    this.appendIfDefined(params, 'set_name', request.set_name);
    this.appendIfDefined(params, 'set_desc', request.set_desc);
    this.appendIfDefined(params, 'set_icon', request.set_icon);
    this.appendIfDefined(params, 'set_price', request.set_price);
    this.appendIfDefined(params, 'set_price_type', request.set_price_type);

    // Adjustment properties
    this.appendIfDefined(params, 'own_number', request.own_number);
    this.appendIfDefined(params, 'own_number_type', request.own_number_type);
    this.appendIfDefined(params, 'stock_number', request.stock_number);
    this.appendIfDefined(params, 'stock_number_type', request.stock_number_type);

    // Boolean flags
    this.appendIfDefined(params, 'disable_purchase', request.disable_purchase, (val) =>
      val ? 'true' : 'false'
    );
    this.appendIfDefined(params, 'disable_use', request.disable_use, (val) =>
      val ? 'true' : 'false'
    );

    // Other properties
    this.appendIfDefined(params, 'action_text', request.action_text);
    this.appendIfDefined(params, 'title_color_string', request.title_color_string);

    // JSON parameters
    this.appendIfDefined(params, 'effects', request.effects, (val) => JSON.stringify(val));
    this.appendIfDefined(params, 'purchase_limit', request.purchase_limit, (val) =>
      JSON.stringify(val)
    );

    this.appendIfDefined(params, 'category_id', request.category_id);
    this.appendIfDefined(params, 'order', request.order);
    this.appendIfDefined(params, 'unlist', request.unlist, (val) => (val ? 'true' : 'false'));

    return this.buildFinalUrl(LIFEUP_URL_SCHEMES.ITEM, params);
  }

  /**
   * Build penalty URL
   */
  private buildPenaltyUrl(request: Types.ApplyPenaltyRequest): string {
    // Validate string inputs for security
    this.validateStringInput(request.content, 'penalty content');
    this.validateStringInput(request.item_name, 'item name');

    const params = new URLSearchParams();

    // Required
    params.append('type', request.type);
    params.append('content', request.content);
    params.append('number', String(request.number));

    // Skills array (for exp type)
    this.appendArray(params, 'skills', request.skills);

    // Item identifiers (for item type)
    this.appendIfDefined(params, 'item_id', request.item_id);
    this.appendIfDefined(params, 'item_name', request.item_name);

    // Optional flags
    this.appendIfDefined(params, 'silent', request.silent, (val) => (val ? 'true' : 'false'));

    return this.buildFinalUrl(LIFEUP_URL_SCHEMES.PENALTY, params);
  }

  /**
   * Build edit skill URL
   */
  private buildEditSkillUrl(request: Types.EditSkillRequest): string {
    // Validate string inputs for security
    this.validateStringInput(request.content, 'skill name');
    this.validateStringInput(request.desc, 'skill description');

    const params = new URLSearchParams();

    // Identifier (for editing/deleting)
    this.appendIfDefined(params, 'id', request.id);

    // Skill properties
    this.appendIfDefined(params, 'content', request.content);
    this.appendIfDefined(params, 'desc', request.desc);
    this.appendIfDefined(params, 'icon', request.icon);
    this.appendIfDefined(params, 'color', request.color);
    this.appendIfDefined(params, 'type', request.type);
    this.appendIfDefined(params, 'order', request.order);
    this.appendIfDefined(params, 'status', request.status);
    this.appendIfDefined(params, 'exp', request.exp);
    this.appendIfDefined(params, 'delete', request.delete, (val) => (val ? 'true' : 'false'));

    return this.buildFinalUrl(LIFEUP_URL_SCHEMES.SKILL, params);
  }

  /**
   * Create a subtask for an existing task
   */
  async createSubtask(request: Types.CreateSubtaskRequest): Promise<Types.SubtaskApiResponse> {
    return this.executeUrlSchemeOperation(
      () => {
        const url = this.buildSubtaskUrl(request);
        this.configManager.logIfDebug('Creating subtask with URL:', url);
        return url;
      },
      'create subtask',
      (response) => {
        this.configManager.logIfDebug('Create subtask response:', response);
        return response.data as Types.SubtaskApiResponse;
      }
    );
  }

  /**
   * Edit an existing subtask
   */
  async editSubtask(request: Types.EditSubtaskRequest): Promise<Types.SubtaskApiResponse> {
    return this.executeUrlSchemeOperation(
      () => {
        const url = this.buildSubtaskUrl(request);
        this.configManager.logIfDebug('Editing subtask with URL:', url);
        return url;
      },
      'edit subtask',
      (response) => {
        this.configManager.logIfDebug('Edit subtask response:', response);
        return response.data as Types.SubtaskApiResponse;
      }
    );
  }

  /**
   * Create multiple subtasks for a task (batch operation)
   * Used internally when creating task with inline subtasks.
   * Processes subtasks sequentially with rate limiting to preserve order and avoid API overload.
   *
   * @param parentTaskId - The ID of the parent task
   * @param subtasks - Array of subtask definitions to create
   * @returns Batch result containing successes and failures arrays for full transparency
   *
   * @remarks
   * - Subtasks are created sequentially (not in parallel) to preserve order
   * - 50ms delay is added between each subtask creation to avoid overwhelming the API
   * - Partial success is allowed - some subtasks may fail while others succeed
   * - For n subtasks, total time ≈ (n-1) * 50ms + network latency
   * - Complexity: O(n) where n is the number of subtasks
   *
   * @example
   * ```typescript
   * const result = await lifeupClient['createSubtasksBatch'](123, [
   *   { todo: 'First step', exp: 10 },
   *   { todo: 'Second step', exp: 20 }
   * ]);
   * // result.successes contains successfully created subtasks
   * // result.failures contains any subtasks that failed to create
   * ```
   */
  private async createSubtasksBatch(
    parentTaskId: number,
    subtasks: Types.SubtaskDefinition[]
  ): Promise<Types.SubtaskBatchResult> {
    const successes: Types.SubtaskApiResponse[] = [];
    const failures: Array<{ subtask: Types.SubtaskDefinition; error: string }> = [];

    // Create subtasks sequentially to preserve order
    // Add rate limiting to avoid overwhelming the API (50ms delay between creations)
    const RATE_LIMIT_MS = 50;
    for (let i = 0; i < subtasks.length; i++) {
      const subtask = subtasks[i];
      try {
        const request: Types.CreateSubtaskRequest = {
          main_id: parentTaskId,
          ...subtask,
        };
        const result = await this.createSubtask(request);
        successes.push(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.configManager.logIfDebug(`Failed to create subtask: ${subtask.todo}`, error);
        failures.push({
          subtask,
          error: errorMessage,
        });
        // Continue with remaining subtasks - allow partial success
      }

      // Add delay between subtask creations (except after the last one)
      if (i < subtasks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS));
      }
    }

    return { successes, failures };
  }

  /**
   * Build subtask URL for create/edit operations
   */
  private buildSubtaskUrl(request: Types.CreateSubtaskRequest | Types.EditSubtaskRequest): string {
    // Validate string inputs for security
    if (request.main_name) {
      this.validateStringInput(request.main_name, 'main task name');
    }
    if ('todo' in request && request.todo) {
      this.validateStringInput(request.todo, 'subtask content');
    }
    if ('edit_name' in request && request.edit_name) {
      this.validateStringInput(request.edit_name, 'subtask name');
    }

    const params = new URLSearchParams();

    // Parent task identification (at least one required)
    this.appendIfDefined(params, 'main_id', request.main_id);
    this.appendIfDefined(params, 'main_gid', request.main_gid);
    this.appendIfDefined(params, 'main_name', request.main_name);

    // Edit mode if edit identifiers present
    if ('edit_id' in request) {
      this.appendIfDefined(params, 'edit_id', request.edit_id);
    }
    if ('edit_gid' in request) {
      this.appendIfDefined(params, 'edit_gid', request.edit_gid);
    }
    if ('edit_name' in request) {
      this.appendIfDefined(params, 'edit_name', request.edit_name);
    }

    // Subtask content
    if ('todo' in request) {
      this.appendIfDefined(params, 'todo', request.todo);
    }

    // Optional fields
    this.appendIfDefined(params, 'remind_time', request.remind_time);
    this.appendIfDefined(params, 'order', request.order);
    this.appendIfDefined(params, 'coin', request.coin);
    this.appendIfDefined(params, 'coin_var', request.coin_var);
    this.appendIfDefined(params, 'exp', request.exp);

    // Set types (edit only)
    if ('coin_set_type' in request) {
      this.appendIfDefined(params, 'coin_set_type', request.coin_set_type);
    }
    if ('exp_set_type' in request) {
      this.appendIfDefined(params, 'exp_set_type', request.exp_set_type);
    }

    // Boolean flags
    this.appendIfDefined(params, 'auto_use_item', request.auto_use_item, (val) =>
      val ? 'true' : 'false'
    );

    // Item rewards - single item
    this.appendIfDefined(params, 'item_id', request.item_id);
    this.appendIfDefined(params, 'item_name', request.item_name);
    this.appendIfDefined(params, 'item_amount', request.item_amount);

    // Item rewards - array
    if (request.items && request.items.length > 0) {
      this.appendIfDefined(params, 'items', request.items, (val) => JSON.stringify(val));
    }

    return this.buildFinalUrl(LIFEUP_URL_SCHEMES.SUBTASK, params);
  }
}

// Singleton instance (production)
export const lifeupClient = new LifeUpClient();

/**
 * Factory function for creating test LifeUpClient instances
 * Used in tests to provide mock ConfigManager and axios instances
 */
export function createTestClient(
  config?: ConfigManager,
  axiosInstance?: AxiosInstance
): LifeUpClient {
  return LifeUpClient.create(config, axiosInstance);
}
