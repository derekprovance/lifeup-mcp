/**
 * Shared helper utilities for tool implementations
 */

import { lifeupClient } from '../client/lifeup-client.js';
import { configManager } from '../config/config.js';
import { ErrorHandler, LifeUpError } from '../error/error-handler.js';
import { ZodError } from 'zod';

/**
 * Ensure LifeUp server is reachable with helpful error message
 */
export async function ensureServerHealthy(): Promise<void> {
  const isHealthy = await lifeupClient.healthCheck();
  if (!isHealthy) {
    throw new LifeUpError(
      'LifeUp server is unreachable',
      'SERVER_UNREACHABLE',
      'The LifeUp server is not responding. Please:\n' +
      '1. Ensure LifeUp is running on your Android device\n' +
      '2. Check your WiFi connection\n' +
      `3. Verify the IP address is correct (current: ${configManager.getConfig().host})\n\n` +
      'If the IP has changed, update it with:\n' +
      '  LIFEUP_HOST=<new-ip>',
      true
    );
  }
}

/**
 * Handle errors from tool execution and format for Claude
 */
export function handleToolError(error: unknown, context: string): string {
  if (error instanceof LifeUpError) {
    return `❌ Error: ${ErrorHandler.formatErrorForClaude(error)}`;
  }

  if (error instanceof ZodError) {
    const messages = error.issues.map((e) => `- ${e.path.join('.')}: ${e.message}`).join('\n');
    return `❌ Invalid input:\n${messages}`;
  }

  return `❌ Unexpected error ${context}: ${(error as Error).message}`;
}
