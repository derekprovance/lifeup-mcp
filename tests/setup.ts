import { vi, beforeEach } from 'vitest';

// Set test environment variables
process.env.LIFEUP_HOST = '127.0.0.1';
process.env.LIFEUP_PORT = '13276';
process.env.LIFEUP_API_TOKEN = '';
process.env.DEBUG = 'false';

// Global mocks setup
vi.mock('axios');

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
