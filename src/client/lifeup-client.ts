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
}

// Singleton instance
export const lifeupClient = new LifeUpClient();
