import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerPurchaseStatusPrompt(server: McpServer) {
  server.prompt(
    'purchase-status',
    'Review recent transactions and their receipts.',
    {
      limit: z.string().optional().describe('Number of recent transactions to show (default 5)'),
    },
    async ({ limit }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Show me the status of my recent AgentPay transactions (last ${limit ?? '5'}):`,
              '',
              '1. Call agentpay_status to get recent transactions',
              '2. For each completed transaction, call agentpay_get_receipt',
              '3. Present a summary table with:',
              '   - Transaction ID',
              '   - Merchant',
              '   - Amount',
              '   - Status',
              '   - Confirmation ID (if completed)',
            ].join('\n'),
          },
        },
      ],
    })
  );
}
