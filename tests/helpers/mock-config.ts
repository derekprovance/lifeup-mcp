import { ConfigManager, createTestConfig as configTestFactory } from '@/config/config';

/**
 * Helper to create a mock ConfigManager instance for testing
 * Returns a ConfigManager with test-friendly defaults
 */
export function createMockConfigManager(overrides?: Partial<{
  host: string;
  port: number;
  baseUrl: string;
  timeout: number;
  retries: number;
  debug: boolean;
  apiToken?: string;
}>): ConfigManager {
  return configTestFactory({
    host: '127.0.0.1',
    port: 13276,
    baseUrl: 'http://127.0.0.1:13276',
    timeout: 10000,
    retries: 2,
    debug: false,
    apiToken: '',
    ...overrides,
  });
}
