import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerBudgetCheckPrompt(server: McpServer) {
  server.prompt(
    'budget-check',
    'Check current balance, spending limits, and pending transactions.',
    {},
    async () => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'Check my AgentPay budget status:',
              '',
              '1. Call agentpay_check_balance to get current balance and limits',
              '2. Call agentpay_list_pending to see any pending transactions',
              '3. Summarize:',
              '   - Available balance',
              '   - Per-transaction limit',
              '   - Total budget and amount spent',
              '   - Number of pending transactions (if any)',
            ].join('\n'),
          },
        },
      ],
    })
  );
}
