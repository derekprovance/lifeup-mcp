/**
 * Tests for error handling utilities
 * Tests LifeUpError class and ErrorHandler static methods
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LifeUpError, ErrorHandler } from '@/error/error-handler';
import { AxiosError } from 'axios';
import * as config from '@/config/config';

// Mock configManager
vi.mock('@/config/config', async () => {
  const actual = await vi.importActual('@/config/config');
  return {
    ...actual,
    configManager: {
      getConfig: vi.fn(() => ({
        host: '192.168.1.100',
        port: 13276,
        baseUrl: 'http://192.168.1.100:13276',
      })),
    },
  };
});

// ============================================================================
// LifeUpError Tests
// ============================================================================

describe('LifeUpError', () => {
  describe('constructor', () => {
    it('creates error with all parameters', () => {
      const error = new LifeUpError(
        'Technical message',
        'TEST_CODE',
        'User-friendly message',
        true
      );

      expect(error.message).toBe('Technical message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.userMessage).toBe('User-friendly message');
      expect(error.recoverable).toBe(true);
      expect(error.name).toBe('LifeUpError');
    });

    it('defaults recoverable to false', () => {
      const error = new LifeUpError(
        'Technical message',
        'TEST_CODE',
        'User message'
      );

      expect(error.recoverable).toBe(false);
    });

    it('can be thrown and caught as Error', () => {
      const error = new LifeUpError('msg', 'CODE', 'user msg');
      expect(() => {
        throw error;
      }).toThrow(LifeUpError);
    });
  });

  describe('instanceof checks', () => {
    it('is instanceof LifeUpError', () => {
      const error = new LifeUpError('msg', 'CODE', 'user');
      expect(error instanceof LifeUpError).toBe(true);
    });

    it('is instanceof Error', () => {
      const error = new LifeUpError('msg', 'CODE', 'user');
      expect(error instanceof Error).toBe(true);
    });
  });
});

// ============================================================================
// ErrorHandler.handleNetworkError Tests
// ============================================================================

describe('ErrorHandler.handleNetworkError', () => {
  describe('ECONNREFUSED error', () => {
    it('returns CONNECTION_REFUSED error with helpful message', () => {
      const axiosError = {
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED 192.168.1.100:13276',
      } as AxiosError;

      const result = ErrorHandler.handleNetworkError(axiosError);

      expect(result).toBeInstanceOf(LifeUpError);
      expect(result.code).toBe('CONNECTION_REFUSED');
      expect(result.recoverable).toBe(true);
      expect(result.userMessage).toContain('LifeUp server is not reachable');
      expect(result.userMessage).toContain('192.168.1.100:13276');
      expect(result.userMessage).toContain('LIFEUP_HOST');
      expect(result.userMessage).toContain('LIFEUP_PORT');
    });

    it('includes connection debugging steps', () => {
      const axiosError = {
        code: 'ECONNREFUSED',
        message: 'connection refused',
      } as AxiosError;

      const result = ErrorHandler.handleNetworkError(axiosError);

      expect(result.userMessage).toContain('LifeUp app is running');
      expect(result.userMessage).toContain('same WiFi network');
      expect(result.userMessage).toContain('IP address is correct');
    });
  });

  describe('ENOTFOUND error', () => {
    it('returns HOSTNAME_RESOLUTION_FAILED with message', () => {
      const axiosError = {
        code: 'ENOTFOUND',
        message: 'getaddrinfo ENOTFOUND invalid.hostname',
      } as AxiosError;

      const result = ErrorHandler.handleNetworkError(axiosError);

      expect(result.code).toBe('HOSTNAME_RESOLUTION_FAILED');
      expect(result.recoverable).toBe(true);
      expect(result.userMessage).toContain('Cannot resolve');
      expect(result.userMessage).toContain('IP address');
    });

    it('includes hostname in error message', () => {
      const axiosError = {
        code: 'ENOTFOUND',
        message: 'lookup failed',
      } as AxiosError;

      const result = ErrorHandler.handleNetworkError(axiosError);

      expect(result.userMessage).toContain('192.168.1.100');
    });
  });

  describe('ETIMEDOUT error', () => {
    it('returns REQUEST_TIMEOUT with retry suggestion', () => {
      const axiosError = {
        code: 'ETIMEDOUT',
        message: 'timeout of 10000ms exceeded',
      } as AxiosError;

      const result = ErrorHandler.handleNetworkError(axiosError);

      expect(result.code).toBe('REQUEST_TIMEOUT');
      expect(result.recoverable).toBe(true);
      expect(result.userMessage).toContain('taking too long to respond');
      expect(result.userMessage).toContain('Try again');
    });
  });

  describe('ECONNABORTED error', () => {
    it('returns REQUEST_TIMEOUT', () => {
      const axiosError = {
        code: 'ECONNABORTED',
        message: 'connection aborted',
      } as AxiosError;

      const result = ErrorHandler.handleNetworkError(axiosError);

      expect(result.code).toBe('REQUEST_TIMEOUT');
      expect(result.recoverable).toBe(true);
    });
  });

  describe('generic network error', () => {
    it('returns NETWORK_ERROR for unknown codes', () => {
      const axiosError = {
        code: 'UNKNOWN_CODE',
        message: 'Unknown network error',
      } as AxiosError;

      const result = ErrorHandler.handleNetworkError(axiosError);

      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.recoverable).toBe(true);
      expect(result.userMessage).toContain('Network error');
    });

    it('includes original error message', () => {
      const axiosError = {
        code: 'CUSTOM_ERROR',
        message: 'Custom error details',
      } as AxiosError;

      const result = ErrorHandler.handleNetworkError(axiosError);

      expect(result.userMessage).toContain('Custom error details');
    });
  });

  describe('all network errors are recoverable', () => {
    it.each([
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'ECONNABORTED',
      'UNKNOWN',
    ])('%s errors are marked as recoverable', (code) => {
      const axiosError = { code, message: 'Test error' } as AxiosError;
      const result = ErrorHandler.handleNetworkError(axiosError);
      expect(result.recoverable).toBe(true);
    });
  });
});

// ============================================================================
// ErrorHandler.handleApiError Tests
// ============================================================================

describe('ErrorHandler.handleApiError', () => {
  describe('401 Unauthorized', () => {
    it('returns UNAUTHORIZED error', () => {
      const axiosError = {
        response: { status: 401, data: {} },
      } as AxiosError;

      const result = ErrorHandler.handleApiError(axiosError, 'listTasks');

      expect(result.code).toBe('UNAUTHORIZED');
      expect(result.recoverable).toBe(true);
      expect(result.userMessage).toContain('API token is invalid');
    });

    it('mentions LIFEUP_API_TOKEN environment variable', () => {
      const axiosError = {
        response: { status: 401, data: {} },
      } as AxiosError;

      const result = ErrorHandler.handleApiError(axiosError, 'test');

      expect(result.userMessage).toContain('LIFEUP_API_TOKEN');
    });

    it('is recoverable', () => {
      const axiosError = {
        response: { status: 401, data: {} },
      } as AxiosError;

      const result = ErrorHandler.handleApiError(axiosError, 'test');

      expect(result.recoverable).toBe(true);
    });
  });

  describe('500 Server Error', () => {
    it('returns SERVER_ERROR', () => {
      const axiosError = {
        response: {
          status: 500,
          data: { message: 'Internal server error' },
        },
      } as AxiosError;

      const result = ErrorHandler.handleApiError(axiosError, 'createTask');

      expect(result.code).toBe('SERVER_ERROR');
      expect(result.recoverable).toBe(true);
      expect(result.userMessage).toContain('LifeUp server encountered an error');
    });

    it('includes server error message', () => {
      const axiosError = {
        response: {
          status: 500,
          data: { message: 'Database connection failed' },
        },
      } as AxiosError;

      const result = ErrorHandler.handleApiError(axiosError, 'test');

      expect(result.userMessage).toContain('Database connection failed');
    });

    it('suggests trying again later', () => {
      const axiosError = {
        response: { status: 500, data: {} },
      } as AxiosError;

      const result = ErrorHandler.handleApiError(axiosError, 'test');

      expect(result.userMessage).toContain('Try again later');
    });

    it('is recoverable', () => {
      const axiosError = {
        response: { status: 500, data: {} },
      } as AxiosError;

      const result = ErrorHandler.handleApiError(axiosError, 'test');

      expect(result.recoverable).toBe(true);
    });

    it('handles missing error message', () => {
      const axiosError = {
        response: { status: 500, data: {} },
      } as AxiosError;

      const result = ErrorHandler.handleApiError(axiosError, 'test');

      expect(result.userMessage).toBeDefined();
      expect(result.userMessage.length).toBeGreaterThan(0);
    });
  });

  describe('10002 Content Provider Error', () => {
    it('returns CONTENT_PROVIDER_ERROR', () => {
      const axiosError = {
        response: {
          status: 200,
          data: { code: 10002, message: 'Feature not available' },
        },
      } as AxiosError;

      const result = ErrorHandler.handleApiError(axiosError, 'getAchievements');

      expect(result.code).toBe('CONTENT_PROVIDER_ERROR');
      expect(result.userMessage).toContain('LifeUp feature not available');
    });

    it('includes content provider error message', () => {
      const axiosError = {
        response: {
          status: 200,
          data: { code: 10002, message: 'Achievements not configured' },
        },
      } as AxiosError;

      const result = ErrorHandler.handleApiError(axiosError, 'test');

      expect(result.userMessage).toContain('Achievements not configured');
    });

    it('suggests version or configuration issue', () => {
      const axiosError = {
        response: {
          status: 200,
          data: { code: 10002, message: 'Not available' },
        },
      } as AxiosError;

      const result = ErrorHandler.handleApiError(axiosError, 'test');

      expect(result.userMessage).toContain('LifeUp version');
      expect(result.userMessage).toContain('configured');
    });

    it('is NOT recoverable', () => {
      const axiosError = {
        response: {
          status: 200,
          data: { code: 10002, message: 'Error' },
        },
      } as AxiosError;

      const result = ErrorHandler.handleApiError(axiosError, 'test');

      expect(result.recoverable).toBe(false);
    });

    it('handles missing content provider error message', () => {
      const axiosError = {
        response: { status: 200, data: { code: 10002 } },
      } as AxiosError;

      const result = ErrorHandler.handleApiError(axiosError, 'test');

      expect(result.userMessage).toBeDefined();
      expect(result.userMessage.length).toBeGreaterThan(0);
    });
  });

  describe('generic API error', () => {
    it('returns API_ERROR for other status codes', () => {
      const axiosError = {
        response: {
          status: 403,
          data: { message: 'Forbidden' },
        },
      } as AxiosError;

      const result = ErrorHandler.handleApiError(axiosError, 'updateTask');

      expect(result.code).toBe('API_ERROR');
      expect(result.recoverable).toBe(true);
    });

    it('includes context in error', () => {
      const axiosError = {
        response: { status: 400, data: {} },
      } as AxiosError;

      const result = ErrorHandler.handleApiError(axiosError, 'deleteAchievement');

      expect(result.userMessage).toContain('deleteAchievement');
    });

    it('includes error message', () => {
      const axiosError = {
        response: {
          status: 422,
          data: { message: 'Invalid parameters' },
        },
      } as AxiosError;

      const result = ErrorHandler.handleApiError(axiosError, 'test');

      expect(result.userMessage).toBeDefined();
    });

    it('is recoverable', () => {
      const axiosError = {
        response: { status: 400, data: {} },
      } as AxiosError;

      const result = ErrorHandler.handleApiError(axiosError, 'test');

      expect(result.recoverable).toBe(true);
    });
  });

  describe('context parameter handling', () => {
    it('uses context in error message', () => {
      const axiosError = {
        response: { status: 400, data: {} },
      } as AxiosError;

      const result = ErrorHandler.handleApiError(axiosError, 'myCustomContext');

      expect(result.userMessage).toContain('myCustomContext');
    });

    it('handles empty context', () => {
      const axiosError = {
        response: { status: 400, data: {} },
      } as AxiosError;

      const result = ErrorHandler.handleApiError(axiosError, '');

      expect(result.userMessage).toBeDefined();
    });
  });
});

// ============================================================================
// ErrorHandler.formatErrorForClaude Tests
// ============================================================================

describe('ErrorHandler.formatErrorForClaude', () => {
  it('formats error with error name and user message', () => {
    const error = new LifeUpError(
      'Technical message',
      'TEST_CODE',
      'User-friendly message',
      true
    );

    const formatted = ErrorHandler.formatErrorForClaude(error);

    expect(formatted).toContain('**Error**:');
    expect(formatted).toContain('LifeUpError');
    expect(formatted).toContain('User-friendly message');
  });

    it('does NOT include technical message', () => {
    const error = new LifeUpError(
      'Internal technical details',
      'CODE',
      'Safe user message'
    );

    const formatted = ErrorHandler.formatErrorForClaude(error);

    expect(formatted).not.toContain('Internal technical details');
  });

  it('returns markdown formatted string', () => {
    const error = new LifeUpError('msg', 'CODE', 'User message');
    const formatted = ErrorHandler.formatErrorForClaude(error);

    expect(formatted).toContain('**Error**:');
    expect(formatted).toContain('\n\n');
  });

  it('works with long user messages', () => {
    const longMessage = 'This is a very long user message '.repeat(10);
    const error = new LifeUpError('msg', 'CODE', longMessage);

    const formatted = ErrorHandler.formatErrorForClaude(error);

    expect(formatted).toContain(longMessage);
  });

  it('works with special characters', () => {
    const error = new LifeUpError(
      'msg',
      'CODE',
      'Error: Invalid token! Check @LIFEUP_API_TOKEN environment variable.'
    );

    const formatted = ErrorHandler.formatErrorForClaude(error);

    expect(formatted).toContain('Invalid token');
    expect(formatted).toContain('@LIFEUP_API_TOKEN');
  });
});

// ============================================================================
// ErrorHandler.isRecoverable Tests
// ============================================================================

describe('ErrorHandler.isRecoverable', () => {
  it('returns true for recoverable errors', () => {
    const error = new LifeUpError('msg', 'CODE', 'user msg', true);
    expect(ErrorHandler.isRecoverable(error)).toBe(true);
  });

  it('returns false for non-recoverable errors', () => {
    const error = new LifeUpError('msg', 'CODE', 'user msg', false);
    expect(ErrorHandler.isRecoverable(error)).toBe(false);
  });

  it('returns false when recoverable is not explicitly set', () => {
    const error = new LifeUpError('msg', 'CODE', 'user msg');
    expect(ErrorHandler.isRecoverable(error)).toBe(false);
  });

  it('works with various error codes', () => {
    const connectionError = new LifeUpError('msg', 'CONNECTION_REFUSED', 'user', true);
    const contentError = new LifeUpError('msg', 'CONTENT_PROVIDER_ERROR', 'user', false);

    expect(ErrorHandler.isRecoverable(connectionError)).toBe(true);
    expect(ErrorHandler.isRecoverable(contentError)).toBe(false);
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('ErrorHandler integration', () => {
  it('network error can be caught and formatted', () => {
    const axiosError = {
      code: 'ECONNREFUSED',
      message: 'Connection refused',
    } as AxiosError;

    const error = ErrorHandler.handleNetworkError(axiosError);
    const formatted = ErrorHandler.formatErrorForClaude(error);

    expect(formatted).toContain('LifeUpError');
    expect(formatted).toContain('LifeUp server is not reachable');
  });

  it('API error can be caught and formatted', () => {
    const axiosError = {
      response: { status: 401, data: {} },
    } as AxiosError;

    const error = ErrorHandler.handleApiError(axiosError, 'test');
    const formatted = ErrorHandler.formatErrorForClaude(error);

    expect(formatted).toContain('API token is invalid');
  });

  it('recoverable flag is preserved through formatting', () => {
    const axiosError = {
      code: 'ETIMEDOUT',
      message: 'Timeout',
    } as AxiosError;

    const error = ErrorHandler.handleNetworkError(axiosError);
    const isRecoverable = ErrorHandler.isRecoverable(error);

    expect(isRecoverable).toBe(true);
  });

  it('content provider errors are non-recoverable', () => {
    const axiosError = {
      response: { status: 200, data: { code: 10002 } },
    } as AxiosError;

    const error = ErrorHandler.handleApiError(axiosError, 'test');
    const isRecoverable = ErrorHandler.isRecoverable(error);

    expect(isRecoverable).toBe(false);
  });
});
