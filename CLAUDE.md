# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**LifeUp MCP Server** is a Model Context Protocol (MCP) server that enables Claude to interact with the LifeUp task management app running on a local Android device. The server acts as a bridge between Claude and LifeUp's HTTP API, exposing 20 tools for task creation, achievement management, querying, user profile information, shop browsing, and data mutation operations. In SAFE_MODE, 14 tools are available (11 read-only + 3 create operations).

## Architecture

### High-Level Design

```
Claude (via MCP)
    ↓
MCP Server (Node.js/TypeScript)
    ├── Request Handlers (server.ts)
    ├── Tool Implementations (tools/)
    ├── API Client (client/lifeup-client.ts)
    ├── Configuration (config/)
    ├── Error Handling (error/)
    └── Validation (via Zod)
    ↓
HTTP Client (axios)
    ↓
LifeUp Cloud API (Android Device)
```

### Key Components

**server.ts** - MCP server initialization and tool registration
- Registers two request handlers: `tools/list` and `tools/call`
- Dispatches tool calls to appropriate tool implementations
- Uses Zod schemas for request validation

**client/lifeup-client.ts** - HTTP wrapper around LifeUp's REST API
- Singleton instance (`lifeupClient`)
- Handles all HTTP requests to LifeUp server
- Converts axios errors to `LifeUpError` with user-friendly messages
- Health check capability for connectivity verification

**tools/task-tools.ts** - Task management operations
- 5 exported static methods: `createTask`, `listAllTasks`, `searchTasks`, `getTaskHistory`, `getTaskCategories`
- All return formatted markdown strings for Claude
- Calls `lifeupClient` methods and wraps results in error handling

**tools/achievement-tools.ts** - Achievement querying, matching, and management
- `listAchievements` - Lists all achievements by fetching from all categories (N+1 requests where N=category count), with fallback to categories if unavailable
- `listAchievementCategories` - Lists all achievement categories with IDs and descriptions
- `matchTaskToAchievements` - Keyword-based matching algorithm to suggest relevant achievements for a task
- `createAchievement` - Create new custom achievements with optional unlock conditions and rewards
- `updateAchievement` - Modify existing achievement properties (name, description, conditions, rewards)
- `deleteAchievement` - Delete achievement definitions permanently

**tools/user-info-tools.ts** - User profile and character information
- `listSkills` - Lists all skills with levels, experience, and progress to next level
- `getUserInfo` - Displays player name, character level, version, and total experience
- `getCoinBalance` - Shows current coin balance and currency information
- Helps users understand their character progression and economy

**tools/shop-tools.ts** - Shop browsing and item search
- `listShopItems` - Lists all shop items with prices, stock availability, and owned quantities
- `getShopCategories` - Lists all shop item categories for organization
- `searchShopItems` - Filters items by name, category, and price range
- Enables users to browse and search the shop inventory

**tools/mutation-tools.ts** - Safe data mutation operations
- `editTask` - Edit existing task properties (name, rewards, deadline, category, appearance)
- `addShopItem` - Create new shop items with price, stock, effects, and purchase limits
- `editShopItem` - Modify shop items with absolute/relative adjustments
- `applyPenalty` - Apply penalties (coins, exp, or items) with custom reasons
- `editSkill` - Create, update, or delete skills; adjust skill experience points
- All operations are "safe" - they don't auto-grant rewards or auto-complete tasks

**config/config.ts** - Configuration singleton
- Loads environment variables (LIFEUP_HOST, LIFEUP_PORT, LIFEUP_API_TOKEN, DEBUG, SAFE_MODE)
- Provides `configManager` singleton
- Debug logging utility for troubleshooting
- Safe mode support for disabling mutation tools

**config/validation.ts** - Zod schemas for input validation
- `CreateTaskSchema`, `SearchTasksSchema`, `TaskHistorySchema`, `AchievementMatchSchema`, `SearchShopItemsSchema`
- All tool inputs validated before execution

**error/error-handler.ts** - Error handling utilities
- `LifeUpError` class with technical and user-facing messages
- `ErrorHandler.handleNetworkError()` - Maps axios errors to LifeUpError
- `ErrorHandler.handleApiError()` - Handles HTTP response errors
- Graceful fallback for API features that may not be available

**client/types.ts** - TypeScript interfaces for all API response types
- Mirrors LifeUp API schema (Task, Achievement, Category, Skill, Item, etc.)
- Used for type-safe API client methods

**client/constants.ts** - API endpoints and configuration constants
- `API_ENDPOINTS` - All LifeUp REST endpoints
- `LIFEUP_URL_SCHEMES` - lifeup:// protocol URLs for task creation
- Status codes and response codes

### Mutation Operations

The server supports "safe mutations" - create/update/delete operations that require explicit parameters and don't automatically affect game state:

**Safe Mutations (Available):**
1. **Task Management:**
   - `create_task` - Creates tasks that must be manually completed in the app
   - `edit_task` - Edit existing task properties (name, rewards, deadline, category, appearance)

2. **Achievement Management:**
   - `create_achievement` - Create new achievements without unlocking them (locked by default)
   - `update_achievement` - Modify achievement properties
   - `delete_achievement` - Remove achievement definitions

3. **Shop Item Management:**
   - `add_shop_item` - Create new shop items
   - `edit_shop_item` - Modify item properties with absolute/relative adjustments

4. **Resource Management:**
   - `apply_penalty` - Apply coins/exp/item penalties with custom reasons (not auto-granted rewards)
   - `edit_skill` - Create, update, or delete skills; adjust skill experience

**Prohibited Operations:**
- Task completion/deletion (requires manual action in app)
- Shop purchases (requires manual action in app)
- Achievement unlocking (achievements are created locked by default)
- Reward grants (use create_task with rewards or apply_penalty instead)

Enforcement through:
1. URL scheme whitelisting (only safe endpoints exposed)
2. Default safe parameters (e.g., unlocked: false for achievements)
3. Tool implementations use explicit parameters (not auto-granted rewards)
4. Penalties require custom reason text (explicit user intent)

**SAFE_MODE Behavior:**
- When SAFE_MODE is enabled, create operations remain available
- Edit and delete operations are blocked both at tool list registration and runtime
- Users receive clear error messages if attempting blocked operations

### Error Flow

```
API Call (axios) → Error
    ↓
ErrorHandler.handleNetworkError/handleApiError
    ↓
LifeUpError (technical message + user message)
    ↓
Tool catches and formats as user-friendly response string
    ↓
Claude receives actionable error message
```

## Common Commands

### Build and Development

```bash
# Build TypeScript to JavaScript (required before running)
npm run build

# Watch mode - auto-recompile on file changes
npm run watch

# Start the server (must build first)
npm run start

# Development mode with hot reload
npm run dev

# Test the server with test suite
node test-mcp.js
```

### Configuration

```bash
# Create .env from template (required)
cp .env.example .env

# Edit configuration
nano .env

# Enable debug logging
DEBUG=true npm run start
```

### Debugging

```bash
# Run with debug output to see API calls and tool execution
DEBUG=true npm run start

# Check if server responds correctly
node test-mcp.js

# Rebuild and test in one command
npm run build && node test-mcp.js
```

## Workflow for Common Tasks

### Adding a New MCP Tool

1. Create tool method in appropriate file:
   - `tools/task-tools.ts` - Task management tools
   - `tools/achievement-tools.ts` - Achievement tools
   - `tools/user-info-tools.ts` - User profile and character tools
   - `tools/shop-tools.ts` - Shop and inventory tools
   - Create new file for tools in new category
2. Add input validation schema to config/validation.ts (if input parameters needed)
3. Add client method to `client/lifeup-client.ts` if new API endpoint needed
4. Register handler in server.ts `setupToolHandlers()` method
5. Add tool definition to `getTools()` method with proper schema
6. Update this file with the new tool
7. Test with: `npm run build && node test-mcp.js`

### Modifying API Client

1. Add/update endpoint in client/constants.ts if needed
2. Update or add method to LifeUpClient class
3. Update types.ts with response types if data structure changes
4. Test with: `npm run build && npm run start`

### Handling New Error Cases

1. Add new error code handling in error/error-handler.ts
2. Provide both technical message and user-friendly message
3. Set `recoverable` flag if user can fix it (e.g., IP change)
4. Import and use in relevant tool or client method
5. Test error case manually or add to test-mcp.js

### Improving Achievement Matching

The matching algorithm is in `AchievementTools.findMatches()`:
- Extracts keywords from task name
- Searches for keywords in achievement text
- Applies confidence scoring
- Returns top 5 matches

To improve: modify keyword extraction or confidence calculation logic.

## Configuration

### Environment Variables (.env)

- **LIFEUP_HOST** - IP address of Android device running LifeUp (default: 10.103.2.235)
- **LIFEUP_PORT** - HTTP API port (default: 13276)
- **LIFEUP_API_TOKEN** - Optional authentication token (leave empty if not configured)
- **DEBUG** - Enable debug logging (default: false, set to "true" for logs)
- **SAFE_MODE** - When true, disables edit and delete mutation tools (default: false). Create operations (create_task, create_achievement, add_shop_item) remain available. Only edit/delete operations (edit_task, update_achievement, delete_achievement, edit_shop_item, apply_penalty, edit_skill) are blocked.

### Runtime Configuration

Timeout, retries, and other runtime config defined in src/config/config.ts:
- `timeout: 10000` - Request timeout in milliseconds
- `retries: 2` - Number of retries for failed requests
- These can be modified in config.ts and rebuilt

## Testing Strategy

The project includes automated tests using Vitest that verify:
1. Input validation rejects invalid requests
2. Error handling works correctly
3. Achievement matching algorithm functions properly

Run with: `npm run test:run`

Additional tests:
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate coverage report
- `npm run test:ui` - Run tests with UI

## Dependencies

- **@modelcontextprotocol/sdk** - MCP protocol implementation
- **axios** - HTTP client for LifeUp API
- **zod** - Runtime input validation
- **dotenv** - Environment variable loading
- **typescript** - Language (dev only)
- **@types/node** - Node types (dev only)
- **tsx** - TypeScript executor (dev only)

## Key Design Decisions

1. **Singleton Singletons** - configManager and lifeupClient are module-level singletons for easy access throughout the app
2. **Zod for Validation** - Runtime validation catches bad input from Claude before API calls
3. **Graceful Degradation** - Achievement endpoint failures fall back to categories instead of failing completely
4. **Markdown Output** - All tools return formatted markdown strings for rich Claude display
5. **User-Friendly Errors** - All errors include actionable guidance (e.g., "update LIFEUP_HOST if IP changed")
6. **Read-Only by Design** - API client only wraps safe endpoints, enforced at source
7. **Granular SAFE_MODE** - SAFE_MODE distinguishes between create (allowed) and edit/delete (blocked) operations, enabling safe experimentation with new entities while preventing data corruption. Runtime enforcement provides defense-in-depth.

## LifeUp API Integration

The server wraps LifeUp Cloud's HTTP API. Key integration points:

- **Task Management** - Uses `/tasks`, `/history`, and task categories endpoints
- **Task Creation** - Uses `lifeup://api/add_task` URL scheme via `/api` endpoint
- **Achievements** - Fetches from all categories using `/achievement_categories` and `/achievements/{category_id}` endpoints for querying
- **Achievement Management** - Uses `lifeup://api/achievement` URL scheme for CRUD operations (create/update/delete)
- **Skills** - Reads from `/skills` endpoint for character progression
- **Shop & Items** - Uses `/items` and `/items_categories` endpoints for inventory browsing
- **User Profile** - Uses `/info` and `/coin` endpoints for account information
- **Error Code 10002** - Indicates ContentProvider error (feature unavailable in this LifeUp version)

For API details, refer to the documentation in the `docs/` folder (markdown files are more accurate than the autogenerated JSON). For general information, see: https://docs.lifeupapp.fun/en/#/guide/api

## MCP Protocol Details

The server implements MCP's JSON-RPC protocol over stdio:

- Request Handler 1: `tools/list` - Returns array of available tools with schemas
- Request Handler 2: `tools/call` - Executes specified tool with provided arguments
- Both handlers use Zod schemas for validation
- Responses include `content` array with `type: 'text'` and markdown text

No custom request types or resources are exposed (tools only).

## TypeScript Configuration

- Target: ES2020 (Node.js 18+)
- Module: ES2020 (ESM imports)
- Strict mode enabled with all checks
- Declaration files generated for type safety
- Source maps for debugging

No linter configured (ESLint recommended for production).
