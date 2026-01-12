import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/e2e/setup.ts'],

    // E2E tests are slower and may involve network latency
    testTimeout: 180000,
    hookTimeout: 180000,

    // Run tests sequentially to avoid conflicts and resource contention
    pool: 'threads',
    threads: {
      singleThread: true,
    },

    // Only include e2e tests
    include: ['tests/e2e/**/*.test.ts'],
    exclude: ['tests/unit/**', 'node_modules/**'],

    // No coverage for e2e (focus on integration validation)
    coverage: {
      enabled: false,
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
