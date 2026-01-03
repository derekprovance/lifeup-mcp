/**
 * Configuration management for LifeUp MCP Server
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { DEFAULT_CONFIG } from '../client/constants.js';

// Load .env file from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../../');
dotenv.config({ path: resolve(projectRoot, '.env') });

export interface LifeUpConfig {
  host: string;
  port: number;
  apiToken?: string;
  baseUrl: string;
  timeout: number;
  retries: number;
  debug: boolean;
}

export class ConfigManager {
  private config: LifeUpConfig;

  constructor(overrides?: Partial<LifeUpConfig>) {
    const host = overrides?.host || process.env.LIFEUP_HOST || DEFAULT_CONFIG.HOST;
    const port = overrides?.port || parseInt(process.env.LIFEUP_PORT || String(DEFAULT_CONFIG.PORT), 10);
    const apiToken = overrides?.apiToken || process.env.LIFEUP_API_TOKEN;
    const debug = overrides?.debug ?? (process.env.DEBUG === 'true');

    this.config = {
      host,
      port,
      apiToken: apiToken && apiToken.trim() ? apiToken : undefined,
      baseUrl: overrides?.baseUrl || `http://${host}:${port}`,
      timeout: overrides?.timeout || DEFAULT_CONFIG.TIMEOUT,
      retries: overrides?.retries || DEFAULT_CONFIG.RETRIES,
      debug,
    };
  }

  /**
   * Factory method for creating ConfigManager instances with overrides
   * Useful for testing where you want to provide custom configuration
   */
  static create(overrides?: Partial<LifeUpConfig>): ConfigManager {
    return new ConfigManager(overrides);
  }

  getConfig(): LifeUpConfig {
    return this.config;
  }

  getBaseUrl(): string {
    return this.config.baseUrl;
  }

  getApiToken(): string | undefined {
    return this.config.apiToken;
  }

  updateHost(host: string): void {
    this.config.host = host;
    this.config.baseUrl = `http://${host}:${this.config.port}`;
  }

  updatePort(port: number): void {
    this.config.port = port;
    this.config.baseUrl = `http://${this.config.host}:${port}`;
  }

  isDebugMode(): boolean {
    return this.config.debug;
  }

  logIfDebug(message: string, data?: any): void {
    if (this.config.debug) {
      console.error(`[DEBUG] ${message}`, data ? JSON.stringify(data) : '');
    }
  }
}

// Singleton instance (production)
export const configManager = new ConfigManager();

/**
 * Factory function for creating test ConfigManager instances
 * Used in tests to provide custom configuration without affecting the singleton
 */
export function createTestConfig(overrides?: Partial<LifeUpConfig>): ConfigManager {
  return ConfigManager.create(overrides);
}
