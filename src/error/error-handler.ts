/**
 * Error handling and user prompt management
 */

import { configManager } from '../config/config.js';
import { AxiosError } from 'axios';

export class LifeUpError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage: string,
    public recoverable: boolean = false
  ) {
    super(message);
    this.name = 'LifeUpError';
  }
}

export class ErrorHandler {
  static handleNetworkError(error: AxiosError): LifeUpError {
    const config = configManager.getConfig();
    const baseUrl = config.baseUrl;

    if (error.code === 'ECONNREFUSED') {
      return new LifeUpError(
        `Connection refused at ${baseUrl}`,
        'CONNECTION_REFUSED',
        `LifeUp server is not reachable at ${baseUrl}. Please ensure:\n` +
        `1. LifeUp app is running on your Android device\n` +
        `2. Your devices are connected to the same WiFi network\n` +
        `3. The IP address is correct (current: ${config.host}:${config.port})\n\n` +
        `You can update the IP by setting environment variables:\n` +
        `  LIFEUP_HOST=<new-ip>\n` +
        `  LIFEUP_PORT=<port>`,
        true
      );
    }

    if (error.code === 'ENOTFOUND') {
      return new LifeUpError(
        `Cannot resolve hostname ${config.host}`,
        'HOSTNAME_RESOLUTION_FAILED',
        `Cannot resolve the LifeUp server address: ${config.host}. ` +
        `Please check that the IP address is correct or try using a different hostname.`,
        true
      );
    }

    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return new LifeUpError(
        `Request timeout to ${baseUrl}`,
        'REQUEST_TIMEOUT',
        `LifeUp server is taking too long to respond. It may be under heavy load or the connection may be unstable. ` +
        `Try again in a moment.`,
        true
      );
    }

    return new LifeUpError(
      `Network error: ${error.message}`,
      'NETWORK_ERROR',
      `Network error connecting to LifeUp: ${error.message}. Please check your connection.`,
      true
    );
  }

  static handleApiError(error: AxiosError, context: string): LifeUpError {
    const status = error.response?.status;
    const responseData = error.response?.data as Record<string, unknown> | undefined;

    if (status === 401) {
      return new LifeUpError(
        'Unauthorized: Invalid API token',
        'UNAUTHORIZED',
        `API token is invalid. Please check your LifeUp settings and ensure the API token matches ` +
        `the LIFEUP_API_TOKEN environment variable.`,
        true
      );
    }

    if (status === 500) {
      const message = responseData?.message || 'Internal server error';
      return new LifeUpError(
        `LifeUp server error: ${message}`,
        'SERVER_ERROR',
        `LifeUp server encountered an error: ${message}. This may be a temporary issue. Try again later.`,
        true
      );
    }

    if (responseData?.code === 10002) {
      // Content Provider error
      const errorMsg = responseData?.message || 'Content provider error';
      return new LifeUpError(
        `Content provider error: ${errorMsg}`,
        'CONTENT_PROVIDER_ERROR',
        `LifeUp feature not available: ${errorMsg}. This may indicate the feature is not available ` +
        `in your LifeUp version or is not properly configured.`,
        false
      );
    }

    return new LifeUpError(
      `API error in ${context}: ${error.message}`,
      'API_ERROR',
      `Error communicating with LifeUp (${context}): ${error.message}`,
      true
    );
  }

  static formatErrorForClaude(error: LifeUpError): string {
    return `**Error**: ${error.name}\n\n${error.userMessage}`;
  }

  static isRecoverable(error: LifeUpError): boolean {
    return error.recoverable;
  }
}
