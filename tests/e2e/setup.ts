import { beforeAll } from 'vitest';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * E2E Test Setup
 *
 * Verifies configuration before running any e2e tests.
 * This ensures the LifeUp server is properly configured and reachable.
 */

// Load .env file
config();

// Get configuration from environment
const getConfig = () => {
  const envPath = resolve(process.cwd(), '.env');

  // Try to read and parse .env file for display
  let envContent = '';
  try {
    envContent = readFileSync(envPath, 'utf-8');
  } catch {
    // Ignore if file doesn't exist
  }

  const lifeupHost = process.env.LIFEUP_HOST;
  const lifeupPort = process.env.LIFEUP_PORT || '13276';
  const safeMode = process.env.SAFE_MODE === 'true';
  const baseUrl = lifeupHost ? `http://${lifeupHost}:${lifeupPort}` : undefined;

  return {
    host: lifeupHost,
    port: lifeupPort,
    baseUrl,
    safeMode,
  };
};

beforeAll(() => {
  const config = getConfig();

  // Verify configuration
  if (!config.host || config.host === 'undefined') {
    throw new Error(
      'LIFEUP_HOST not configured. Please set up .env file with your LifeUp server address.\n' +
        'Example:\n' +
        '  LIFEUP_HOST=192.168.1.100\n' +
        '  LIFEUP_PORT=13276'
    );
  }

  if (!config.port) {
    throw new Error('LIFEUP_PORT not configured. Default is 13276.');
  }

  // Display configuration
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           E2E Testing Configuration                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  ✓ Host:        ${config.host}`);
  console.log(`  ✓ Port:        ${config.port}`);
  console.log(`  ✓ Base URL:    ${config.baseUrl}`);
  console.log(`  ✓ Safe Mode:   ${config.safeMode ? 'ENABLED (edit/delete blocked)' : 'DISABLED (all operations allowed)'}`);
  console.log('');
  console.log('⚠️  WARNING: These tests will interact with REAL LifeUp data!');
  console.log('');
  console.log('  All test data will be prefixed with [E2E-TEST] and cleaned up');
  console.log('  automatically after each test suite completes.');
  console.log('');
  console.log('  If any test fails, check the LifeUp app and manually delete');
  console.log('  any remaining items with [E2E-TEST] prefix.');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
}, 120000); // Increased timeout for setup
