/**
 * LifeUp Cloud API HTTP Client
 * Handles all communication with the LifeUp server
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { configManager, ConfigManager } from '../config/config.js';
import { ErrorHandler, LifeUpError } from '../error/error-handler.js';
import { API_ENDPOINTS, RESPONSE_CODE, LIFEUP_URL_SCHEMES, LIFEUP_VERSION } from './constants.js';
import * as Types from './types.js';

export class LifeUpClient {
  private axiosInstance: AxiosInstance;
  private configManager: ConfigManager;

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
   */
  async createTask(request: Types.CreateTaskRequest): Promise<Types.Task | null> {
    try {
      const params = this.buildTaskUrl(request);
      this.configManager.logIfDebug('Creating task with params:', params);

      const response = await this.executeUrlScheme(params);

      if (response.code === RESPONSE_CODE.SUCCESS) {
        // Parse the response to get task details
        // The API may return the created task ID or confirmation
        return { ...request, id: Date.now(), gid: 1 } as Types.Task;
      }

      throw new LifeUpError(
        `Failed to create task: ${response.message}`,
        'TASK_CREATION_FAILED',
        `Could not create task: ${response.message}`,
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
        `Unexpected error creating task: ${(error as Error).message}`,
        'UNKNOWN_ERROR',
        `An unexpected error occurred while creating the task.`,
        false
      );
    }
  }

  /**
   * Build lifeup:// URL for task creation
   */
  private buildTaskUrl(request: Types.CreateTaskRequest): string {
    const params = new URLSearchParams();
    params.append('todo', request.name);

    if (request.exp !== undefined) {
      params.append('exp', String(request.exp));
    }
    if (request.coin !== undefined) {
      params.append('coin', String(request.coin));
    }
    if (request.coinVar !== undefined) {
      params.append('coin_var', String(request.coinVar));
    }
    if (request.categoryId !== undefined) {
      params.append('category', String(request.categoryId));
    }
    if (request.deadline !== undefined) {
      params.append('deadline', String(request.deadline));
    }
    if (request.content !== undefined) {
      params.append('notes', request.content);
    }
    if (request.skillIds !== undefined && request.skillIds.length > 0) {
      request.skillIds.forEach(id => {
        params.append('skills', String(id));
      });
    }

    return `${LIFEUP_URL_SCHEMES.TASK_CREATE}?${params.toString().replace(/\+/g, '%20')}`;
  }

  /**
   * Execute a URL scheme via the API gateway
   */
  private async executeUrlScheme(url: string): Promise<Types.HttpResponse> {
    try {
      this.configManager.logIfDebug(`Executing URL scheme via ${API_ENDPOINTS.API_GATEWAY}`, { url });
      const response = await this.axiosInstance.post(API_ENDPOINTS.API_GATEWAY, { urls: [url] });
      this.configManager.logIfDebug(`URL scheme response:`, response.data);
      return response.data;
    } catch (error) {
      this.configManager.logIfDebug(`URL scheme error:`, error instanceof AxiosError ? error.message : error);
      if (error instanceof AxiosError) {
        throw ErrorHandler.handleNetworkError(error);
      }
      throw error;
    }
  }

  /**
   * Get all tasks
   */
  async getAllTasks(): Promise<Types.Task[]> {
    try {
      const response = await this.axiosInstance.get<Types.HttpResponse<Types.Task[]>>(
        API_ENDPOINTS.TASKS
      );

      if (response.data.code === RESPONSE_CODE.SUCCESS && Array.isArray(response.data.data)) {
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
  async getTaskHistory(offset = 0, limit = 100): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get<Types.HttpResponse>(
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
      this.configManager.logIfDebug(`Failed to fetch achievements for category ${categoryId}:`, error);
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
      const achievementPromises = categories.map(category =>
        this.getAchievementsByCategory(category.id)
      );

      const achievementArrays = await Promise.all(achievementPromises);

      // Step 3: Flatten and combine all achievements
      const allAchievements = achievementArrays.flat();

      this.configManager.logIfDebug(`Fetched ${allAchievements.length} total achievements from ${categories.length} categories`);

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
  async getCoinInfo(): Promise<any> {
    try {
      const response = await this.axiosInstance.get<Types.HttpResponse>(
        API_ENDPOINTS.COIN
      );

      if (response.data.code === RESPONSE_CODE.SUCCESS) {
        return response.data.data;
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
    try {
      const url = this.buildAchievementUrl(request);
      this.configManager.logIfDebug('Creating achievement with URL:', url);
      const response = await this.executeUrlScheme(url);

      if (response.code === RESPONSE_CODE.SUCCESS) {
        return response;
      }

      throw new LifeUpError(
        `Failed to create achievement: ${response.message}`,
        'ACHIEVEMENT_CREATION_FAILED',
        `Could not create achievement: ${response.message}`,
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
        `Unexpected error creating achievement: ${(error as Error).message}`,
        'UNKNOWN_ERROR',
        `An unexpected error occurred while creating the achievement.`,
        false
      );
    }
  }

  /**
   * Update an existing achievement
   */
  async updateAchievement(request: Types.UpdateAchievementRequest): Promise<Types.HttpResponse> {
    try {
      const url = this.buildAchievementUrl(request);
      this.configManager.logIfDebug('Updating achievement with URL:', url);
      const response = await this.executeUrlScheme(url);

      this.configManager.logIfDebug('Update achievement response:', response);

      if (response.code === RESPONSE_CODE.SUCCESS) {
        return response;
      }

      throw new LifeUpError(
        `Failed to update achievement: ${response.message} (Code: ${response.code})`,
        'ACHIEVEMENT_UPDATE_FAILED',
        `Could not update achievement: ${response.message}`,
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
        `Unexpected error updating achievement: ${(error as Error).message}`,
        'UNKNOWN_ERROR',
        `An unexpected error occurred while updating the achievement.`,
        false
      );
    }
  }

  /**
   * Delete an achievement
   */
  async deleteAchievement(request: Types.DeleteAchievementRequest): Promise<Types.HttpResponse> {
    try {
      const url = this.buildAchievementDeleteUrl(request);
      const response = await this.executeUrlScheme(url);

      if (response.code === RESPONSE_CODE.SUCCESS) {
        return response;
      }

      throw new LifeUpError(
        `Failed to delete achievement: ${response.message}`,
        'ACHIEVEMENT_DELETE_FAILED',
        `Could not delete achievement: ${response.message}`,
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
        `Unexpected error deleting achievement: ${(error as Error).message}`,
        'UNKNOWN_ERROR',
        `An unexpected error occurred while deleting the achievement.`,
        false
      );
    }
  }

  /**
   * Build achievement URL for create/update operations
   */
  private buildAchievementUrl(request: Types.CreateAchievementRequest | Types.UpdateAchievementRequest): string {
    const params = new URLSearchParams();

    // Edit mode if edit_id present
    if ('edit_id' in request && request.edit_id) {
      params.append('edit_id', String(request.edit_id));
    }

    // Required for create, optional for update
    if (request.name) params.append('name', request.name);
    if (request.category_id !== undefined) params.append('category_id', String(request.category_id));

    // Optional fields
    if (request.desc) params.append('desc', request.desc);
    if (request.exp !== undefined) params.append('exp', String(request.exp));
    if (request.coin !== undefined) params.append('coin', String(request.coin));
    if (request.coin_var !== undefined) params.append('coin_var', String(request.coin_var));

    // Set types (update only)
    if ('coin_set_type' in request && request.coin_set_type) {
      params.append('coin_set_type', request.coin_set_type);
    }
    if ('exp_set_type' in request && request.exp_set_type) {
      params.append('exp_set_type', request.exp_set_type);
    }

    // Conditions JSON
    if (request.conditions_json && request.conditions_json.length > 0) {
      params.append('conditions_json', JSON.stringify(request.conditions_json));
    }

    // Skills array (multiple params)
    if (request.skills && request.skills.length > 0) {
      request.skills.forEach((skillId) => {
        params.append('skills', String(skillId));
      });
    }

    // Items JSON array
    if (request.items && request.items.length > 0) {
      params.append('items', JSON.stringify(request.items));
    }

    // Single item reward
    if (request.item_id !== undefined) params.append('item_id', String(request.item_id));
    if (request.item_amount !== undefined) params.append('item_amount', String(request.item_amount));

    // Boolean flags
    if (request.secret !== undefined) params.append('secret', request.secret ? 'true' : 'false');
    if (request.unlocked !== undefined) params.append('unlocked', request.unlocked ? 'true' : 'false');
    if ('write_feeling' in request && request.write_feeling !== undefined) {
      params.append('write_feeling', request.write_feeling ? 'true' : 'false');
    }

    // Color (URLSearchParams handles encoding automatically)
    if (request.color) {
      params.append('color', request.color);
    }

    const url = `${LIFEUP_URL_SCHEMES.ACHIEVEMENT}?${params.toString().replace(/\+/g, '%20')}`;
    return url;
  }

  /**
   * Build achievement delete URL
   */
  private buildAchievementDeleteUrl(request: Types.DeleteAchievementRequest): string {
    const params = new URLSearchParams();
    params.append('edit_id', String(request.edit_id));
    params.append('delete', 'true');

    const url = `${LIFEUP_URL_SCHEMES.ACHIEVEMENT}?${params.toString()}`;
    return url;
  }

  /**
   * Edit an existing task
   */
  async editTask(request: Types.EditTaskRequest): Promise<Types.HttpResponse> {
    try {
      const url = this.buildEditTaskUrl(request);
      const response = await this.executeUrlScheme(url);

      if (response.code === RESPONSE_CODE.SUCCESS) {
        return response;
      }

      throw new LifeUpError(
        `Failed to edit task: ${response.message}`,
        'TASK_EDIT_FAILED',
        `Could not edit task: ${response.message}`,
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
        `Unexpected error editing task: ${(error as Error).message}`,
        'UNKNOWN_ERROR',
        `An unexpected error occurred while editing the task.`,
        false
      );
    }
  }

  /**
   * Add a new shop item
   */
  async addShopItem(request: Types.AddShopItemRequest): Promise<Types.HttpResponse> {
    try {
      const url = this.buildAddShopItemUrl(request);
      const response = await this.executeUrlScheme(url);

      if (response.code === RESPONSE_CODE.SUCCESS) {
        return response;
      }

      throw new LifeUpError(
        `Failed to add shop item: ${response.message}`,
        'ITEM_ADD_FAILED',
        `Could not add shop item: ${response.message}`,
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
        `Unexpected error adding shop item: ${(error as Error).message}`,
        'UNKNOWN_ERROR',
        `An unexpected error occurred while adding the shop item.`,
        false
      );
    }
  }

  /**
   * Edit an existing shop item
   */
  async editShopItem(request: Types.EditShopItemRequest): Promise<Types.HttpResponse> {
    try {
      const url = this.buildEditShopItemUrl(request);
      const response = await this.executeUrlScheme(url);

      if (response.code === RESPONSE_CODE.SUCCESS) {
        return response;
      }

      throw new LifeUpError(
        `Failed to edit shop item: ${response.message}`,
        'ITEM_EDIT_FAILED',
        `Could not edit shop item: ${response.message}`,
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
        `Unexpected error editing shop item: ${(error as Error).message}`,
        'UNKNOWN_ERROR',
        `An unexpected error occurred while editing the shop item.`,
        false
      );
    }
  }

  /**
   * Apply a penalty
   */
  async applyPenalty(request: Types.ApplyPenaltyRequest): Promise<Types.HttpResponse> {
    try {
      const url = this.buildPenaltyUrl(request);
      const response = await this.executeUrlScheme(url);

      if (response.code === RESPONSE_CODE.SUCCESS) {
        return response;
      }

      throw new LifeUpError(
        `Failed to apply penalty: ${response.message}`,
        'PENALTY_FAILED',
        `Could not apply penalty: ${response.message}`,
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
        `Unexpected error applying penalty: ${(error as Error).message}`,
        'UNKNOWN_ERROR',
        `An unexpected error occurred while applying the penalty.`,
        false
      );
    }
  }

  /**
   * Edit a skill
   */
  async editSkill(request: Types.EditSkillRequest): Promise<Types.HttpResponse> {
    try {
      const url = this.buildEditSkillUrl(request);
      const response = await this.executeUrlScheme(url);

      if (response.code === RESPONSE_CODE.SUCCESS) {
        return response;
      }

      throw new LifeUpError(
        `Failed to edit skill: ${response.message}`,
        'SKILL_EDIT_FAILED',
        `Could not edit skill: ${response.message}`,
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
        `Unexpected error editing skill: ${(error as Error).message}`,
        'UNKNOWN_ERROR',
        `An unexpected error occurred while editing the skill.`,
        false
      );
    }
  }

  /**
   * Helper to encode hex color for URL (URLSearchParams handles encoding)
   */
  private encodeColor(color: string): string {
    return color;
  }

  /**
   * Helper to append a field to URLSearchParams if defined
   */
  private appendIfDefined(
    params: URLSearchParams,
    key: string,
    value: any,
    formatter?: (val: any) => string
  ): void {
    if (value !== undefined) {
      const stringValue = formatter ? formatter(value) : String(value);
      params.append(key, stringValue);
    }
  }

  /**
   * Helper to append array values (for multi-value parameters like skills)
   */
  private appendArray(params: URLSearchParams, key: string, values: any[] | undefined): void {
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
   * Build edit task URL
   */
  private buildEditTaskUrl(request: Types.EditTaskRequest): string {
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

    // Skills array
    this.appendArray(params, 'skills', request.skills);

    // Other properties
    this.appendIfDefined(params, 'category', request.category);
    this.appendIfDefined(params, 'frequency', request.frequency);
    this.appendIfDefined(params, 'importance', request.importance);
    this.appendIfDefined(params, 'difficulty', request.difficulty);
    this.appendIfDefined(params, 'deadline', request.deadline);
    this.appendIfDefined(params, 'remind_time', request.remind_time);
    this.appendIfDefined(params, 'start_time', request.start_time);

    // Color encoding
    this.appendIfDefined(
      params,
      'color',
      request.color,
      (val) => this.encodeColor(val)
    );

    // Background settings
    this.appendIfDefined(params, 'background_url', request.background_url);
    this.appendIfDefined(params, 'background_alpha', request.background_alpha);
    this.appendIfDefined(params, 'enable_outline', request.enable_outline, (val) => val ? 'true' : 'false');
    this.appendIfDefined(params, 'use_light_remark_text_color', request.use_light_remark_text_color, (val) => val ? 'true' : 'false');

    // Item rewards
    this.appendIfDefined(params, 'item_id', request.item_id);
    this.appendIfDefined(params, 'item_name', request.item_name);
    this.appendIfDefined(params, 'item_amount', request.item_amount);
    this.appendIfDefined(params, 'items', request.items, (val) => JSON.stringify(val));

    // Other flags
    this.appendIfDefined(params, 'auto_use_item', request.auto_use_item, (val) => val ? 'true' : 'false');
    this.appendIfDefined(params, 'frozen', request.frozen, (val) => val ? 'true' : 'false');

    return this.buildFinalUrl(LIFEUP_URL_SCHEMES.TASK_EDIT, params);
  }

  /**
   * Build add shop item URL
   */
  private buildAddShopItemUrl(request: Types.AddShopItemRequest): string {
    const params = new URLSearchParams();

    // Required
    params.append('name', request.name);

    // Optional properties
    this.appendIfDefined(params, 'desc', request.desc);
    this.appendIfDefined(params, 'icon', request.icon);
    this.appendIfDefined(params, 'title_color_string', request.title_color_string, (val) => this.encodeColor(val));
    this.appendIfDefined(params, 'price', request.price);
    this.appendIfDefined(params, 'stock_number', request.stock_number);
    this.appendIfDefined(params, 'action_text', request.action_text);
    this.appendIfDefined(params, 'disable_purchase', request.disable_purchase, (val) => val ? 'true' : 'false');
    this.appendIfDefined(params, 'disable_use', request.disable_use, (val) => val ? 'true' : 'false');
    this.appendIfDefined(params, 'category', request.category);
    this.appendIfDefined(params, 'order', request.order);

    // JSON parameters
    this.appendIfDefined(params, 'purchase_limit', request.purchase_limit, (val) => JSON.stringify(val));
    this.appendIfDefined(params, 'effects', request.effects, (val) => JSON.stringify(val));

    this.appendIfDefined(params, 'own_number', request.own_number);
    this.appendIfDefined(params, 'unlist', request.unlist, (val) => val ? 'true' : 'false');

    return this.buildFinalUrl(LIFEUP_URL_SCHEMES.ITEM, params);
  }

  /**
   * Build edit shop item URL
   */
  private buildEditShopItemUrl(request: Types.EditShopItemRequest): string {
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
    this.appendIfDefined(params, 'disable_purchase', request.disable_purchase, (val) => val ? 'true' : 'false');
    this.appendIfDefined(params, 'disable_use', request.disable_use, (val) => val ? 'true' : 'false');

    // Other properties
    this.appendIfDefined(params, 'action_text', request.action_text);
    this.appendIfDefined(params, 'title_color_string', request.title_color_string, (val) => this.encodeColor(val));

    // JSON parameters
    this.appendIfDefined(params, 'effects', request.effects, (val) => JSON.stringify(val));
    this.appendIfDefined(params, 'purchase_limit', request.purchase_limit, (val) => JSON.stringify(val));

    this.appendIfDefined(params, 'category_id', request.category_id);
    this.appendIfDefined(params, 'order', request.order);
    this.appendIfDefined(params, 'unlist', request.unlist, (val) => val ? 'true' : 'false');

    return this.buildFinalUrl(LIFEUP_URL_SCHEMES.ITEM, params);
  }

  /**
   * Build penalty URL
   */
  private buildPenaltyUrl(request: Types.ApplyPenaltyRequest): string {
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
    this.appendIfDefined(params, 'silent', request.silent, (val) => val ? 'true' : 'false');

    return this.buildFinalUrl(LIFEUP_URL_SCHEMES.PENALTY, params);
  }

  /**
   * Build edit skill URL
   */
  private buildEditSkillUrl(request: Types.EditSkillRequest): string {
    const params = new URLSearchParams();

    // Identifier (for editing/deleting)
    this.appendIfDefined(params, 'id', request.id);

    // Skill properties
    this.appendIfDefined(params, 'content', request.content);
    this.appendIfDefined(params, 'desc', request.desc);
    this.appendIfDefined(params, 'icon', request.icon);
    this.appendIfDefined(params, 'color', request.color, (val) => this.encodeColor(val));
    this.appendIfDefined(params, 'type', request.type);
    this.appendIfDefined(params, 'order', request.order);
    this.appendIfDefined(params, 'status', request.status);
    this.appendIfDefined(params, 'exp', request.exp);
    this.appendIfDefined(params, 'delete', request.delete, (val) => val ? 'true' : 'false');

    return this.buildFinalUrl(LIFEUP_URL_SCHEMES.SKILL, params);
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
