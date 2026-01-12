import { spawn, ChildProcess } from 'child_process';
import { resolve } from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

/**
 * Response structure from an MCP tool call
 */
export interface MCPToolResponse {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
  text: string;
}

/**
 * MCP Test Client
 *
 * Spawns the LifeUp MCP server as a child process and communicates with it
 * via the MCP protocol over stdio (JSON-RPC).
 *
 * This enables end-to-end testing of the full MCP server implementation,
 * including the stdio transport layer and all tool implementations.
 */
export class MCPTestClient {
  private client: Client | null = null;
  private serverProcess: ChildProcess | null = null;
  private transport: StdioClientTransport | null = null;

  /**
   * Start the MCP server as a child process and establish connection
   *
   * @param env Optional environment variables to pass to the server process.
   *            Useful for testing different configurations (e.g., SAFE_MODE).
   * @throws Error if server fails to start or connection cannot be established
   */
  async start(env?: Record<string, string>): Promise<void> {
    // Merge provided env with current process env
    const processEnv = {
      ...process.env,
      ...env,
    };

    // Resolve server path for absolute reference
    const serverPath = resolve(__dirname, '../../..', 'build/index.js');

    // Create stdio transport with command to spawn
    // The transport will handle spawning the process
    this.transport = new StdioClientTransport({
      command: 'node',
      args: [serverPath],
      env: processEnv,
      stderr: 'pipe',
    });

    // Create MCP client
    this.client = new Client(
      {
        name: 'lifeup-e2e-test-client',
        version: '1.0.0',
      },
      { capabilities: {} }
    );

    // Connect client to transport - this spawns the server and connects
    await this.client.connect(this.transport);

    // Give server time to initialize and become ready
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  /**
   * Call a tool via the MCP protocol
   *
   * @param name The tool name (e.g., 'create_task', 'list_all_tasks')
   * @param args Tool arguments as an object
   * @returns Parsed response with content array and extracted text
   * @throws Error if client is not connected or tool execution fails
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<MCPToolResponse> {
    if (!this.client) {
      throw new Error('MCP client not connected. Call start() first.');
    }

    try {
      const response = await this.client.callTool({
        name,
        arguments: args,
      });

      return {
        content: response.content,
        isError: response.isError,
        text: this.extractText(response.content),
      };
    } catch (error) {
      throw new Error(`Tool call failed for '${name}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List all available tools
   *
   * @returns Array of available tools with name and description
   * @throws Error if client is not connected
   */
  async listTools(): Promise<Array<{ name: string; description: string }>> {
    if (!this.client) {
      throw new Error('MCP client not connected. Call start() first.');
    }

    try {
      const response = await this.client.listTools();
      return response.tools;
    } catch (error) {
      throw new Error(`Failed to list tools: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Stop the server and cleanup resources
   *
   * Sends SIGTERM to gracefully shutdown the server, with a fallback to
   * SIGKILL after 5 seconds if the process doesn't exit cleanly.
   */
  async stop(): Promise<void> {
    // Close client connection
    if (this.client) {
      try {
        await this.client.close();
      } catch (error) {
        // Ignore errors during close
      }
      this.client = null;
    }

    // Stop server process
    if (this.serverProcess) {
      // Send graceful shutdown signal
      this.serverProcess.kill('SIGTERM');

      // Wait for exit or force kill after timeout
      await Promise.race([
        new Promise<void>((resolve) => {
          this.serverProcess!.once('exit', () => resolve());
        }),
        new Promise<void>((resolve) => {
          setTimeout(() => {
            if (this.serverProcess && !this.serverProcess.killed) {
              this.serverProcess.kill('SIGKILL');
            }
            resolve();
          }, 5000);
        }),
      ]);

      this.serverProcess = null;
    }

    this.transport = null;
  }

  /**
   * Extract text content from MCP response content array
   *
   * MCP responses contain a content array with type and text fields.
   * This extracts just the text portions and joins them.
   *
   * @private
   */
  private extractText(content: Array<{ type: string; text: string }>): string {
    return content
      .filter((item) => item.type === 'text')
      .map((item) => item.text)
      .join('\n');
  }
}
