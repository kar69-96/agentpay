import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AgentPay } from '@useagentpay/sdk';
import { mapError } from '../errors.js';

export function registerProposeTool(server: McpServer, ap: AgentPay) {
  server.tool(
    'agentpay_propose_purchase',
    'Propose a new purchase. Creates a pending transaction that requires human approval before execution.',
    {
      merchant: z.string().describe('Merchant name (e.g. "Amazon", "Target")'),
      amount: z.number().positive().describe('Purchase amount in USD'),
      description: z.string().describe('What is being purchased'),
      url: z.string().url().describe('Product or checkout URL'),
    },
    async ({ merchant, amount, description, url }) => {
      try {
        const tx = ap.transactions.propose({ merchant, amount, description, url });
        const { mobileMode } = ap.status();

        const nextAction = mobileMode
          ? `Purchase proposed. Mobile mode is ON — call agentpay_request_mobile_approval with txId "${tx.id}" to send approval link to the user's phone. Then call agentpay_wait_for_approval.`
          : `Purchase proposed. Open the dashboard for the human to approve: npx -p @useagentpay/mcp-server agentpay dashboard — then call agentpay_wait_for_approval with txId "${tx.id}".`;

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                txId: tx.id,
                status: tx.status,
                merchant: tx.merchant,
                amount: tx.amount,
                mobileMode,
                nextAction,
              }),
            },
          ],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: JSON.stringify(mapError(err)) }] };
      }
    }
  );
}
