import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AgentPay } from 'agentpay';
import { mapError } from '../errors.js';

function nextActionForStatus(status: string): string {
  switch (status) {
    case 'pending':
      return 'WAIT - Human must approve via CLI. Use agentpay_wait_for_approval to poll.';
    case 'approved':
      return 'READY - Use agentpay_execute_purchase to complete the purchase.';
    case 'rejected':
      return 'STOP - Transaction was rejected by human.';
    case 'executing':
      return 'WAIT - Purchase is being executed.';
    case 'completed':
      return 'DONE - Use agentpay_get_receipt for confirmation details.';
    case 'failed':
      return 'ERROR - Purchase failed. Human should review.';
    default:
      return 'Unknown status.';
  }
}

export function registerTransactionTools(server: McpServer, ap: AgentPay) {
  server.tool(
    'agentpay_get_transaction',
    'Get the current status and details of a transaction.',
    {
      txId: z.string().describe('Transaction ID (e.g. "tx_abc123")'),
    },
    async ({ txId }) => {
      try {
        const tx = ap.transactions.get(txId);
        if (!tx) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  success: false,
                  error: 'NOT_FOUND',
                  message: `Transaction ${txId} not found.`,
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
                id: tx.id,
                status: tx.status,
                merchant: tx.merchant,
                amount: tx.amount,
                description: tx.description,
                url: tx.url,
                createdAt: tx.createdAt,
                nextAction: nextActionForStatus(tx.status),
              }),
            },
          ],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: JSON.stringify(mapError(err)) }] };
      }
    }
  );

  server.tool(
    'agentpay_wait_for_approval',
    'Long-poll for human approval of a pending transaction. Blocks until approved, rejected, or timeout.',
    {
      txId: z.string().describe('Transaction ID to wait for'),
      pollInterval: z.number().positive().optional().describe('Poll interval in ms (default 2000)'),
      timeout: z.number().positive().optional().describe('Timeout in ms (default 300000 = 5 min)'),
    },
    async ({ txId, pollInterval, timeout }) => {
      try {
        const result = await ap.transactions.waitForApproval(txId, {
          pollInterval: pollInterval ?? 2000,
          timeout: timeout ?? 300000,
        });
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                txId,
                status: result.status,
                reason: result.reason,
                nextAction: nextActionForStatus(result.status),
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
