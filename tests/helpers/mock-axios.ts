import { vi } from 'vitest';
import type { AxiosInstance, AxiosResponse } from 'axios';

/**
 * Creates a mock axios instance for testing
 */
export function createMockAxios(overrides?: Partial<AxiosInstance>): AxiosInstance {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    request: vi.fn(),
    head: vi.fn(),
    options: vi.fn(),
    defaults: {
      headers: {
        common: {},
        delete: {},
        get: {},
        head: {},
        patch: {},
        post: {},
        put: {},
      },
      timeout: 0,
      maxRedirects: 5,
      maxContentLength: -1,
      maxBodyLength: -1,
    },
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
    create: vi.fn(),
    isCancel: vi.fn(),
    CancelToken: { source: vi.fn() },
    Cancel: vi.fn(),
    ...overrides,
  } as any;
}

/**
 * Creates a successful API response
 */
export function mockSuccessResponse<T>(
  data: T,
  code = 200,
  message = 'Success'
): AxiosResponse {
  return {
    data: {
      code,
      message,
      data,
    },
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as any,
  };
}

/**
 * Creates an error API response
 */
export function mockErrorResponse(
  code: number,
  message: string,
  status?: number
): AxiosResponse {
  return {
    data: {
      code,
      message,
      data: null,
    },
    status: status || (code >= 400 ? code : 200),
    statusText: code >= 400 ? 'Error' : 'OK',
    headers: {},
    config: {} as any,
  };
}

/**
 * Creates a network error
 */
export function mockNetworkError(code: string, message: string) {
  return {
    code,
    message,
    errno: -1,
    syscall: 'getaddrinfo',
  };
}
