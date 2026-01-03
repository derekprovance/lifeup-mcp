# LifeUp MCP Server

An MCP server that enables Claude to interact with LifeUp Cloud API on your local network. Supports task creation, querying, and achievement matching.

## Quick Start

1. **Install**

    ```bash
    npm install && npm run build
    ```

2. **Configure**

    ```bash
    cp .env.example .env
    ```

    Update `LIFEUP_HOST` to your Android device's IP (find it in LifeUp Settings → HTTP API)

3. **Run**
    ```bash
    npm run start
    ```

## Available Tools

**Task Management**

-   `create_task` - Create a new task with rewards
-   `list_all_tasks` - List all tasks
-   `search_tasks` - Filter tasks by criteria
-   `get_task_history` - View completed tasks
-   `get_task_categories` - List task categories

**Achievements**

-   `list_achievements` - List all achievements
-   `match_task_to_achievements` - Find matching achievements for a task

**User Info**

-   `get_user_info` - User profile and level
-   `list_skills` - Skills and progression
-   `get_coin_balance` - Current coins

**Shop**

-   `list_shop_items` - Browse items
-   `get_shop_categories` - Item categories
-   `search_shop_items` - Search items

**Safe Mutations**

-   `edit_task` - Edit existing tasks
-   `create_achievement` - Create new achievements
-   `update_achievement` - Update achievements
-   `delete_achievement` - Delete achievements
-   `add_shop_item` - Create shop items
-   `edit_shop_item` - Modify shop items
-   `apply_penalty` - Apply resource penalties
-   `edit_skill` - Manage skills

## Environment Variables

```bash
LIFEUP_HOST=10.103.2.235      # Device IP
LIFEUP_PORT=13276              # API port
LIFEUP_API_TOKEN=              # Optional auth token
DEBUG=false                     # Set to 'true' for logging
SAFE_MODE=false                 # Set to 'true' to disable mutations
```

## Troubleshooting

**Connection failed?**

-   Ensure LifeUp is running with HTTP API enabled
-   Verify both devices are on the same network
-   Check and update `LIFEUP_HOST` in `.env`

**Achievement data unavailable?**

-   This is expected for some LifeUp versions - the server falls back to categories

**Debug errors?**

```bash
DEBUG=true npm run start
```

## Links

-   [LifeUp Docs](https://docs.lifeupapp.fun/en/#/guide/api)
-   [LifeUp SDK](https://github.com/Ayagikei/LifeUp-SDK)
-   [CLAUDE.md](./CLAUDE.md) - Developer guide

## License

MIT
