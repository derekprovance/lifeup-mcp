#!/usr/bin/env node

/**
 * LifeUp MCP Server - Main Entry Point
 *
 * This MCP server enables Claude to interact with LifeUp Cloud API running on a local network.
 * It provides tools for task creation, querying, and achievement matching.
 *
 * Configuration:
 *   LIFEUP_HOST: IP address of LifeUp server (default: 10.103.2.235)
 *   LIFEUP_PORT: Port of LifeUp server (default: 13276)
 *   LIFEUP_API_TOKEN: Optional API token from LifeUp settings
 *   DEBUG: Set to 'true' for debug logging
 *
 * Usage:
 *   node build/index.js
 *
 * With environment variables:
 *   LIFEUP_HOST=192.168.1.100 LIFEUP_PORT=8080 node build/index.js
 */

import './server.js';
