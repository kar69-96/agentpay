import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AgentPay } from 'agentpay';
import { mapError } from '../errors.js';

export function registerStatusTools(server: McpServer, ap: AgentPay) {
  server.tool(
    'agentpay_status',
    'Get AgentPay status: setup state, balance, budget, and pending transactions. Call this first.',
    {},
    async () => {
      try {
        const status = ap.status();
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                ...status,
                pendingCount: status.pending.length,
                nextAction: !status.isSetup
                  ? 'STOP - Human must run: agentpay setup'
                  : status.pending.length > 0
                    ? 'Review pending transactions with agentpay_list_pending'
                    : 'Ready for purchases. Use agentpay_check_balance before proposing.',
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
    'agentpay_check_balance',
    'Check current balance, budget, and per-transaction limit. Call BEFORE proposing a purchase.',
    {},
    async () => {
      try {
        const wallet = ap.wallet.getBalance();
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                ...wallet,
                nextAction:
                  wallet.balance <= 0
                    ? 'STOP - No balance remaining. Human must add budget.'
                    : `Ready. Max single purchase: $${Math.min(wallet.balance, wallet.limitPerTx).toFixed(2)}`,
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
    'agentpay_list_pending',
    'List all pending transactions awaiting human approval.',
    {},
    async () => {
      try {
        const status = ap.status();
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                pending: status.pending,
                count: status.pending.length,
                nextAction:
                  status.pending.length > 0
                    ? 'Human must approve/reject via CLI. Use agentpay_wait_for_approval to poll.'
                    : 'No pending transactions.',
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
