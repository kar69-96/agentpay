import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AgentPay } from '@useagentpay/sdk';
import { registerWalletResource } from './wallet.js';
import { registerTransactionResource } from './transaction.js';
import { registerAuditResource } from './audit.js';

export function registerResources(server: McpServer, ap: AgentPay) {
  registerWalletResource(server, ap);
  registerTransactionResource(server, ap);
  registerAuditResource(server, ap);
}
