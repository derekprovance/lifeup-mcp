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

class ConfigManager {
  private config: LifeUpConfig;

  constructor() {
    const host = process.env.LIFEUP_HOST || DEFAULT_CONFIG.HOST;
    const port = parseInt(process.env.LIFEUP_PORT || String(DEFAULT_CONFIG.PORT), 10);
    const apiToken = process.env.LIFEUP_API_TOKEN;
    const debug = process.env.DEBUG === 'true';

    this.config = {
      host,
      port,
      apiToken: apiToken && apiToken.trim() ? apiToken : undefined,
      baseUrl: `http://${host}:${port}`,
      timeout: DEFAULT_CONFIG.TIMEOUT,
      retries: DEFAULT_CONFIG.RETRIES,
      debug,
    };
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

// Singleton instance
export const configManager = new ConfigManager();
