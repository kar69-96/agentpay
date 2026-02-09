import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AgentPay } from 'agentpay';
import type { ServerConfig } from '../config.js';
import { registerStatusTools } from './status.js';
import { registerProposeTool } from './propose.js';
import { registerTransactionTools } from './transactions.js';
import { registerExecuteTool } from './execute.js';
import { registerReceiptTool } from './receipt.js';

export function registerTools(server: McpServer, ap: AgentPay, config: ServerConfig) {
  registerStatusTools(server, ap);
  registerProposeTool(server, ap);
  registerTransactionTools(server, ap);
  registerExecuteTool(server, ap, config);
  registerReceiptTool(server, ap);
}
