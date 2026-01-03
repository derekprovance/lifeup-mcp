/**
 * LifeUp Cloud API HTTP Client
 * Handles all communication with the LifeUp server
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { configManager } from '../config/config.js';
import { ErrorHandler, LifeUpError } from '../error/error-handler.js';
import { API_ENDPOINTS, RESPONSE_CODE, LIFEUP_URL_SCHEMES } from './constants.js';
import * as Types from './types.js';

export class LifeUpClient {
  private axiosInstance: AxiosInstance;

  constructor() {
    const config = configManager.getConfig();

    this.axiosInstance = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout,
      headers: this.buildHeaders(),
    });
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = configManager.getApiToken();
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
      configManager.logIfDebug('Health check failed', error);
      return false;
    }
  }

  /**
   * Create a task via lifeup:// URL scheme
   */
  async createTask(request: Types.CreateTaskRequest): Promise<Types.Task | null> {
    try {
      const params = this.buildTaskUrl(request);
      configManager.logIfDebug('Creating task with params:', params);

      const response = await this.executeUrlScheme(params);

      if (response.code === RESPONSE_CODE.SUCCESS) {
        // Parse the response to get task details
        // The API may return the created task ID or confirmation
        return { ...request, id: Date.now(), gid: 1 } as any;
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
      configManager.logIfDebug(`Executing URL scheme via ${API_ENDPOINTS.API_GATEWAY}`, { url });
      const response = await this.axiosInstance.post(API_ENDPOINTS.API_GATEWAY, { url });
      configManager.logIfDebug(`URL scheme response:`, response.data);
      return response.data;
    } catch (error) {
      configManager.logIfDebug(`URL scheme error:`, error instanceof AxiosError ? error.message : error);
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
   * Get all achievements (may fail with code 10002 in some versions)
   */
  async getAchievements(): Promise<Types.Achievement[] | null> {
    try {
      const response = await this.axiosInstance.get<Types.HttpResponse<Types.Achievement[]>>(
        API_ENDPOINTS.ACHIEVEMENTS
      );

      if (response.data.code === RESPONSE_CODE.SUCCESS && Array.isArray(response.data.data)) {
        return response.data.data;
      }

      // If error code is 10002, return null to indicate fallback needed
      if (response.data.code === RESPONSE_CODE.CONTENT_PROVIDER_ERROR) {
        configManager.logIfDebug('Achievement endpoint returned 10002, using categories as fallback');
        return null;
      }

      return [];
    } catch (error) {
      if (error instanceof AxiosError) {
        const lifeupError = ErrorHandler.handleApiError(error, 'getAchievements');
        configManager.logIfDebug('Achievement fetch error:', lifeupError.message);
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
      const response = await this.executeUrlScheme(url);

      if (response.code === RESPONSE_CODE.SUCCESS) {
        return response;
      }

      throw new LifeUpError(
        `Failed to update achievement: ${response.message}`,
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
    if (request.category_id) params.append('category_id', String(request.category_id));

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

    // Color (must encode # as %23)
    if (request.color) {
      params.append('color', request.color.replace('#', '%23'));
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
   * Build edit task URL
   */
  private buildEditTaskUrl(request: Types.EditTaskRequest): string {
    const params = new URLSearchParams();

    // Task identifiers (at least one required)
    if (request.id !== undefined) params.append('id', String(request.id));
    if (request.gid !== undefined) params.append('gid', String(request.gid));
    if (request.name !== undefined) params.append('name', request.name);

    // Task properties
    if (request.todo !== undefined) params.append('todo', request.todo);
    if (request.notes !== undefined) params.append('notes', request.notes);
    if (request.coin !== undefined) params.append('coin', String(request.coin));
    if (request.coin_var !== undefined) params.append('coin_var', String(request.coin_var));
    if (request.exp !== undefined) params.append('exp', String(request.exp));

    // Skills array
    if (request.skills && request.skills.length > 0) {
      request.skills.forEach(skillId => {
        params.append('skills', String(skillId));
      });
    }

    // Other properties
    if (request.category !== undefined) params.append('category', String(request.category));
    if (request.frequency !== undefined) params.append('frequency', String(request.frequency));
    if (request.importance !== undefined) params.append('importance', String(request.importance));
    if (request.difficulty !== undefined) params.append('difficulty', String(request.difficulty));
    if (request.deadline !== undefined) params.append('deadline', String(request.deadline));
    if (request.remind_time !== undefined) params.append('remind_time', String(request.remind_time));
    if (request.start_time !== undefined) params.append('start_time', String(request.start_time));

    // Color encoding
    if (request.color) {
      params.append('color', request.color.replace('#', '%23'));
    }

    // Background settings
    if (request.background_url !== undefined) params.append('background_url', request.background_url);
    if (request.background_alpha !== undefined) params.append('background_alpha', String(request.background_alpha));
    if (request.enable_outline !== undefined) params.append('enable_outline', request.enable_outline ? 'true' : 'false');
    if (request.use_light_remark_text_color !== undefined) {
      params.append('use_light_remark_text_color', request.use_light_remark_text_color ? 'true' : 'false');
    }

    // Item rewards
    if (request.item_id !== undefined) params.append('item_id', String(request.item_id));
    if (request.item_name !== undefined) params.append('item_name', request.item_name);
    if (request.item_amount !== undefined) params.append('item_amount', String(request.item_amount));
    if (request.items && request.items.length > 0) {
      params.append('items', JSON.stringify(request.items));
    }

    // Other flags
    if (request.auto_use_item !== undefined) params.append('auto_use_item', request.auto_use_item ? 'true' : 'false');
    if (request.frozen !== undefined) params.append('frozen', request.frozen ? 'true' : 'false');

    return `${LIFEUP_URL_SCHEMES.TASK_EDIT}?${params.toString().replace(/\+/g, '%20')}`;
  }

  /**
   * Build add shop item URL
   */
  private buildAddShopItemUrl(request: Types.AddShopItemRequest): string {
    const params = new URLSearchParams();

    // Required
    params.append('name', request.name);

    // Optional properties
    if (request.desc !== undefined) params.append('desc', request.desc);
    if (request.icon !== undefined) params.append('icon', request.icon);

    // Color encoding
    if (request.title_color_string) {
      params.append('title_color_string', request.title_color_string.replace('#', '%23'));
    }

    if (request.price !== undefined) params.append('price', String(request.price));
    if (request.stock_number !== undefined) params.append('stock_number', String(request.stock_number));
    if (request.action_text !== undefined) params.append('action_text', request.action_text);
    if (request.disable_purchase !== undefined) params.append('disable_purchase', request.disable_purchase ? 'true' : 'false');
    if (request.disable_use !== undefined) params.append('disable_use', request.disable_use ? 'true' : 'false');
    if (request.category !== undefined) params.append('category', String(request.category));
    if (request.order !== undefined) params.append('order', String(request.order));

    // JSON parameters
    if (request.purchase_limit && request.purchase_limit.length > 0) {
      params.append('purchase_limit', JSON.stringify(request.purchase_limit));
    }
    if (request.effects && request.effects.length > 0) {
      params.append('effects', JSON.stringify(request.effects));
    }

    if (request.own_number !== undefined) params.append('own_number', String(request.own_number));
    if (request.unlist !== undefined) params.append('unlist', request.unlist ? 'true' : 'false');

    return `${LIFEUP_URL_SCHEMES.ITEM}?${params.toString().replace(/\+/g, '%20')}`;
  }

  /**
   * Build edit shop item URL
   */
  private buildEditShopItemUrl(request: Types.EditShopItemRequest): string {
    const params = new URLSearchParams();

    // Identifiers
    if (request.id !== undefined) params.append('id', String(request.id));
    if (request.name !== undefined) params.append('name', request.name);

    // Set properties
    if (request.set_name !== undefined) params.append('set_name', request.set_name);
    if (request.set_desc !== undefined) params.append('set_desc', request.set_desc);
    if (request.set_icon !== undefined) params.append('set_icon', request.set_icon);
    if (request.set_price !== undefined) params.append('set_price', String(request.set_price));
    if (request.set_price_type !== undefined) params.append('set_price_type', request.set_price_type);

    // Adjustment properties
    if (request.own_number !== undefined) params.append('own_number', String(request.own_number));
    if (request.own_number_type !== undefined) params.append('own_number_type', request.own_number_type);
    if (request.stock_number !== undefined) params.append('stock_number', String(request.stock_number));
    if (request.stock_number_type !== undefined) params.append('stock_number_type', request.stock_number_type);

    // Boolean flags
    if (request.disable_purchase !== undefined) params.append('disable_purchase', request.disable_purchase ? 'true' : 'false');
    if (request.disable_use !== undefined) params.append('disable_use', request.disable_use ? 'true' : 'false');

    // Other properties
    if (request.action_text !== undefined) params.append('action_text', request.action_text);

    // Color encoding
    if (request.title_color_string) {
      params.append('title_color_string', request.title_color_string.replace('#', '%23'));
    }

    // JSON parameters
    if (request.effects && request.effects.length > 0) {
      params.append('effects', JSON.stringify(request.effects));
    }
    if (request.purchase_limit && request.purchase_limit.length > 0) {
      params.append('purchase_limit', JSON.stringify(request.purchase_limit));
    }

    if (request.category_id !== undefined) params.append('category_id', String(request.category_id));
    if (request.order !== undefined) params.append('order', String(request.order));
    if (request.unlist !== undefined) params.append('unlist', request.unlist ? 'true' : 'false');

    return `${LIFEUP_URL_SCHEMES.ITEM}?${params.toString().replace(/\+/g, '%20')}`;
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
    if (request.skills && request.skills.length > 0) {
      request.skills.forEach(skillId => {
        params.append('skills', String(skillId));
      });
    }

    // Item identifiers (for item type)
    if (request.item_id !== undefined) params.append('item_id', String(request.item_id));
    if (request.item_name !== undefined) params.append('item_name', request.item_name);

    // Optional flags
    if (request.silent !== undefined) params.append('silent', request.silent ? 'true' : 'false');

    return `${LIFEUP_URL_SCHEMES.PENALTY}?${params.toString().replace(/\+/g, '%20')}`;
  }

  /**
   * Build edit skill URL
   */
  private buildEditSkillUrl(request: Types.EditSkillRequest): string {
    const params = new URLSearchParams();

    // Identifier (for editing/deleting)
    if (request.id !== undefined) params.append('id', String(request.id));

    // Skill properties
    if (request.content !== undefined) params.append('content', request.content);
    if (request.desc !== undefined) params.append('desc', request.desc);
    if (request.icon !== undefined) params.append('icon', request.icon);

    // Color encoding
    if (request.color) {
      params.append('color', request.color.replace('#', '%23'));
    }

    if (request.type !== undefined) params.append('type', String(request.type));
    if (request.order !== undefined) params.append('order', String(request.order));
    if (request.status !== undefined) params.append('status', String(request.status));
    if (request.exp !== undefined) params.append('exp', String(request.exp));
    if (request.delete !== undefined) params.append('delete', request.delete ? 'true' : 'false');

    return `${LIFEUP_URL_SCHEMES.SKILL}?${params.toString().replace(/\+/g, '%20')}`;
  }
}

// Singleton instance
export const lifeupClient = new LifeUpClient();
