import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerBuyPrompt(server: McpServer) {
  server.prompt(
    'buy',
    'Step-by-step purchase flow: check balance, propose, wait for approval, execute.',
    {
      merchant: z.string().describe('Merchant name'),
      amount: z.string().describe('Purchase amount in USD (e.g. "29.99")'),
      description: z.string().describe('What is being purchased'),
      url: z.string().describe('Product or checkout URL'),
    },
    async ({ merchant, amount, description, url }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `I need to purchase from ${merchant}.`,
              '',
              'Follow these steps exactly:',
              '',
              '1. Call agentpay_check_balance to verify sufficient funds',
              `2. Call agentpay_propose_purchase with:`,
              `   - merchant: "${merchant}"`,
              `   - amount: ${amount}`,
              `   - description: "${description}"`,
              `   - url: "${url}"`,
              '3. Tell me the transaction ID and that I need to approve it',
              '4. Call agentpay_wait_for_approval with the transaction ID',
              '5. Once approved, call agentpay_execute_purchase',
              '6. Call agentpay_get_receipt to confirm',
              '',
              'If any step fails, stop and explain what went wrong.',
            ].join('\n'),
          },
        },
      ],
    })
  );
}
