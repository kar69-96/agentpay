import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerBuyPrompt } from './buy.js';
import { registerBudgetCheckPrompt } from './budget-check.js';
import { registerPurchaseStatusPrompt } from './purchase-status.js';

export function registerPrompts(server: McpServer) {
  registerBuyPrompt(server);
  registerBudgetCheckPrompt(server);
  registerPurchaseStatusPrompt(server);
}
