# LifeUp MCP Server

A Model Context Protocol (MCP) server that enables Claude to interact with LifeUp Cloud API running on your local network. This server allows Claude to create tasks, query achievements, and help you organize your productivity system.

## Features

- **Task Creation**: Create new tasks with experience points and coin rewards
- **Task Querying**: List all tasks or search by criteria (name, status, deadline, category)
- **Task History**: Review your completed tasks and activity patterns
- **Achievement Matching**: Match tasks to relevant achievements based on keywords
- **Achievement Querying**: List and explore available achievements
- **Dynamic IP Handling**: Gracefully handles network changes with user prompts
- **Read-Only Safety**: Cannot complete tasks, purchase items, or unlock achievements

## System Requirements

- macOS with Node.js 18+ installed
- LifeUp Pro app running on Android (Pixel 9 Pro or other device)
- LifeUp Cloud HTTP server enabled
- Local network connectivity between your Mac and Android device

## Installation

### 1. Clone or download this repository

```bash
git clone <repository-url>
cd lifeup-mcp-server
```

### 2. Install dependencies

```bash
npm install
```

### 3. Build the TypeScript code

```bash
npm run build
```

### 4. Configure the server IP

Copy the example configuration:

```bash
cp .env.example .env
```

Edit `.env` and update the IP address to match your LifeUp device:

```bash
# .env
LIFEUP_HOST=10.103.2.235    # Replace with your device's IP
LIFEUP_PORT=13276           # Default LifeUp port
LIFEUP_API_TOKEN=           # Optional, if you set one in LifeUp
DEBUG=false                 # Set to 'true' for debug logging
```

## Finding Your LifeUp Server IP

1. Open LifeUp Pro on your Android device
2. Go to **Settings** → **HTTP API**
3. Enable **HTTP API** if not already enabled
4. You'll see the server address displayed (e.g., `http://10.103.2.235:13276/`)
5. Copy the IP address (e.g., `10.103.2.235`)

## Setting Up with Claude

### Via Claude Code (Recommended)

1. Make sure the MCP server is executable:
```bash
chmod +x build/index.js
```

2. Add to your Claude configuration (usually `~/.claude/config.json` or similar):

```json
{
  "mcp_servers": {
    "lifeup": {
      "command": "node",
      "args": ["/path/to/lifeup-mcp-server/build/index.js"],
      "env": {
        "LIFEUP_HOST": "10.103.2.235",
        "LIFEUP_PORT": "13276"
      }
    }
  }
}
```

3. Restart Claude or reload your configuration

### Testing the Connection

You can test the server locally:

```bash
npm run start
```

The server will start and output debug information. Press Ctrl+C to stop.

## Available Tools

### create_task

Creates a new task in LifeUp.

**Parameters:**
- `name` (required): Task name
- `exp` (optional): Experience points reward
- `coin` (optional): Coin reward
- `categoryId` (optional): Category/list ID
- `deadline` (optional): Deadline as timestamp (milliseconds)
- `skillIds` (optional): Array of associated skill IDs
- `content` (optional): Task description

**Example:**
```
Claude: Create a task called "Read Chapter 5 of Learn You a Haskell" with 50 XP and 25 coins
→ Task created successfully!
```

### list_all_tasks

Lists all tasks from your LifeUp app, showing active and completed tasks.

**Example:**
```
Claude: Show me all my tasks
→ ## Tasks Summary
   Total Tasks: 42
   Active: 35 | Completed: 7

   ### Active Tasks
   - Study Haskell (ID: 123)
   - Review Project PRs (ID: 124)
   ...
```

### search_tasks

Search and filter tasks by criteria.

**Parameters:**
- `searchQuery` (optional): Search text (name or content)
- `categoryId` (optional): Filter by category
- `status` (optional): 'active', 'completed', or 'all'
- `deadlineBefore` (optional): Tasks due before timestamp

**Example:**
```
Claude: Find all active tasks related to "coding"
→ ## Search Results (5 found)
   ○ Implement new feature (ID: 101)
   ○ Code review (ID: 102)
   ...
```

### get_task_history

Retrieve your completed task history to see your activity patterns.

**Parameters:**
- `offset` (optional): Skip this many records
- `limit` (optional): Return this many records (default: 100)

**Example:**
```
Claude: Show me my last 10 completed tasks
→ ## Task History
   - Study JavaScript (2024-01-02 14:30)
     +100 XP
     +50 coin
   ...
```

### get_task_categories

List all task categories/lists in your LifeUp app.

**Example:**
```
Claude: What are my task categories?
→ ## Task Categories
   - Work Projects (ID: 1)
   - Learning (ID: 2)
   - Health & Fitness (ID: 3)
```

### list_achievements

List all available achievements in your LifeUp app.

**Example:**
```
Claude: Show me my achievements
→ ## Achievements
   Unlocked: 12 | Locked: 38

   ### Unlocked Achievements
   ✓ First Step
   ...
```

### match_task_to_achievements

Match a task to related achievements using keyword matching.

**Parameters:**
- `taskName` (required): Task to match
- `categoryId` (optional): Category for more precise matching

**Example:**
```
Claude: What achievements match "Learn Rust"?
→ ## Relevant Achievements
   ### 1. Programming Master
   Master at least 5 programming languages
   Match Confidence: 85%
   Why: Contains "Learn"; Similar to programming tasks
```

## Usage Scenarios

### Creating a Challenge/Goal

```
You: I want to improve my programming skills. Create a learning plan.
Claude: I'll create a structured learning plan. Let me first check your existing tasks and
        achievements to see what you've already been working on.

        [Checks list_all_tasks and list_achievements]

        Based on your progress, here's what I recommend:
        - Create "Learn Rust basics" (100 XP, 50 coin)
        - Create "Build a CLI tool in Rust" (200 XP, 100 coin)

        These match your "Programming Master" achievement. Shall I create these tasks?

You: Yes, create them!
Claude: [Creates both tasks]
        ✓ Task created: Learn Rust basics
        ✓ Task created: Build a CLI tool in Rust
```

### Understanding Your Workload

```
You: How many active tasks do I have, and what's taking up most of my time?
Claude: [Calls list_all_tasks and get_task_history]
        You have 35 active tasks across 5 categories.

        Most time is spent on:
        - Work Projects (24 tasks)
        - Learning (8 tasks)
        - Health (3 tasks)

        Your last 3 completed tasks show you're making progress on the "Fitness"
        achievement. Keep it up!
```

### Matching Tasks to Achievements

```
You: I just created a task about "writing a book chapter". What achievements could this help me unlock?
Claude: [Calls match_task_to_achievements]
        This task matches 3 achievements:
        1. Author (87% confidence) - Write and complete a book chapter
        2. Creative Mind (72% confidence) - Complete creative writing projects
        3. Productivity Master (65% confidence) - Complete 100+ tasks total
```

## Troubleshooting

### "LifeUp server is unreachable"

**Problem**: The server can't connect to your LifeUp app.

**Solutions**:
1. Ensure LifeUp is running on your Android device
2. Check that HTTP API is enabled in LifeUp settings
3. Verify your devices are on the same WiFi network
4. Update the IP in `.env` if your device's IP has changed:
   ```bash
   LIFEUP_HOST=<new-ip>
   ```
5. If on a different WiFi, restart both apps and check the new IP

### "Content Provider error - achievement data unavailable"

**Problem**: Your LifeUp version doesn't expose achievement data through the API.

**Solution**: This is normal for some LifeUp versions. The server will gracefully fall back to achievement categories, which still allows for basic matching and exploration.

### Timeout errors

**Problem**: Requests are timing out.

**Solutions**:
1. Check your network connectivity
2. Ensure your Android device isn't in sleep/doze mode
3. Try restarting the LifeUp app
4. Increase the timeout by modifying `src/config/config.ts` and rebuilding

### Port already in use

**Problem**: If you see port binding errors from LifeUp.

**Solution**: LifeUp automatically tries alternate ports (8080-65535). Check the console output for the actual port being used.

## API Reference

The server wraps the LifeUp Cloud HTTP API. For detailed API information, see:
- LifeUp GitHub: https://github.com/Ayagikei/LifeUp-SDK
- Official Docs: https://docs.lifeupapp.fun/en/#/guide/api

## Configuration Details

### Environment Variables

- `LIFEUP_HOST`: IP address of your LifeUp device (default: 10.103.2.235)
- `LIFEUP_PORT`: Port of the HTTP server (default: 13276)
- `LIFEUP_API_TOKEN`: Optional API token if you set one in LifeUp
- `DEBUG`: Set to 'true' for debug logging in console

### Request Timeout

Default timeout is 10 seconds. To change, edit `src/config/config.ts`:

```typescript
timeout: 10000  // milliseconds
```

Then rebuild:

```bash
npm run build
```

## Development

### Running in Development Mode

```bash
npm run dev
```

This uses `tsx` for hot reloading during development.

### Debugging

Enable debug logging:

```bash
DEBUG=true npm run start
```

This will output detailed logs about all API calls and tool executions.

## Architecture

```
┌─────────────────────────────────────┐
│  Claude / User                      │
└──────────────┬──────────────────────┘
               │ MCP Protocol (stdio)
               ▼
┌──────────────────────────────────────────────────┐
│  LifeUp MCP Server (Node.js)                     │
├──────────────────────────────────────────────────┤
│  • Task Tools (create, list, search)             │
│  • Achievement Tools (match, list)               │
│  • Configuration Management                     │
│  • Error Handling & Validation                  │
├──────────────────────────────────────────────────┤
│  LifeUp API Client (axios)                       │
└──────────────┬───────────────────────────────────┘
               │ HTTP REST API
               ▼
┌─────────────────────────────────────┐
│  LifeUp Cloud API                   │
│  (Android device: 10.103.2.235)    │
└─────────────────────────────────────┘
```

## Security Notes

- **Read-Only by Design**: This server cannot complete tasks, purchase items, or unlock achievements
- **No State Mutation**: All operations are queries or task creation only
- **API Token**: Optional API token is never logged or exposed
- **Network**: Operates on local network only (not exposed to internet)

## License

MIT

## Contributing

Contributions are welcome! Please ensure:
- Code follows TypeScript strict mode
- All tests pass: `npm test`
- Code is properly typed
- Changes include appropriate documentation

## Support

For issues specific to this MCP server, please check:
1. The Troubleshooting section above
2. Debug logs: `DEBUG=true npm run start`
3. LifeUp Cloud API documentation

For issues with LifeUp itself:
- GitHub Issues: https://github.com/Ayagikei/LifeUp-SDK/issues
- LifeUp Forum: https://lifeupapp.fun/
