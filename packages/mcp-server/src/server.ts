import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AgentPay } from '@useagentpay/sdk';
import type { ServerConfig } from './config.js';
import { registerTools } from './tools/index.js';
import { registerResources } from './resources/index.js';
import { registerPrompts } from './prompts/index.js';

export function createServer(config: ServerConfig): McpServer {
  const server = new McpServer({
    name: 'agentpay',
    version: '0.1.0',
  });

  // Shared AgentPay instance (no passphrase — read-only by default)
  const ap = new AgentPay({
    home: config.home,
    executor: config.executor,
  });

  registerTools(server, ap, config);
  registerResources(server, ap);
  registerPrompts(server);

  return server;
}
