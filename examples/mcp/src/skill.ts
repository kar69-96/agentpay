/**
 * MCP Skill Definition for AgentPay
 *
 * This example shows how AgentPay can be exposed as an MCP tool.
 * Register these as tool definitions in your MCP server.
 */

import { AgentPay } from '@useagentpay/sdk';

// MCP tool definitions
export const tools = [
  {
    name: 'propose_purchase',
    description: 'Propose a new purchase for human approval',
    inputSchema: {
      type: 'object' as const,
      properties: {
        merchant: { type: 'string', description: 'Merchant domain (e.g. amazon.com)' },
        amount: { type: 'number', description: 'Purchase amount in USD' },
        description: { type: 'string', description: 'What is being purchased' },
        url: { type: 'string', description: 'Product or checkout URL' },
      },
      required: ['merchant', 'amount', 'description', 'url'],
    },
  },
  {
    name: 'check_balance',
    description: 'Check current wallet balance and limits',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'get_transaction',
    description: 'Get the status of a transaction',
    inputSchema: {
      type: 'object' as const,
      properties: {
        txId: { type: 'string', description: 'Transaction ID' },
      },
      required: ['txId'],
    },
  },
  {
    name: 'execute_purchase',
    description: 'Execute an approved purchase via Browserbase',
    inputSchema: {
      type: 'object' as const,
      properties: {
        txId: { type: 'string', description: 'Transaction ID (must be approved)' },
      },
      required: ['txId'],
    },
  },
];

// Handler
export async function handleTool(name: string, args: Record<string, unknown>) {
  const ap = new AgentPay();

  switch (name) {
    case 'propose_purchase': {
      const tx = ap.transactions.propose({
        merchant: args.merchant as string,
        amount: args.amount as number,
        description: args.description as string,
        url: args.url as string,
      });
      return { txId: tx.id, status: tx.status, message: `Purchase proposed. Run: agentpay approve ${tx.id}` };
    }

    case 'check_balance': {
      const status = ap.status();
      return { balance: status.balance, budget: status.budget, limitPerTx: status.limitPerTx, pending: status.pending.length };
    }

    case 'get_transaction': {
      const tx = ap.transactions.get(args.txId as string);
      if (!tx) return { error: 'Transaction not found' };
      return { id: tx.id, status: tx.status, merchant: tx.merchant, amount: tx.amount };
    }

    case 'execute_purchase': {
      const receipt = await ap.transactions.execute(args.txId as string);
      return { receipt };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// Demo
async function main() {
  console.log('AgentPay MCP Tools:');
  for (const tool of tools) {
    console.log(`  - ${tool.name}: ${tool.description}`);
  }
}

main();
