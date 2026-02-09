import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AgentPay } from 'agentpay';
import { mapError } from '../errors.js';

export function registerReceiptTool(server: McpServer, ap: AgentPay) {
  server.tool(
    'agentpay_get_receipt',
    'Get the receipt for a completed purchase.',
    {
      txId: z.string().describe('Transaction ID of a completed purchase'),
    },
    async ({ txId }) => {
      try {
        const receipt = ap.transactions.getReceipt(txId);
        if (!receipt) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  success: false,
                  error: 'NO_RECEIPT',
                  message: `No receipt found for transaction ${txId}. Transaction may not be completed yet.`,
                  nextAction: 'Check transaction status with agentpay_get_transaction',
                }),
              },
            ],
          };
        }
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                receipt,
                nextAction: 'DONE - Purchase confirmed.',
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
