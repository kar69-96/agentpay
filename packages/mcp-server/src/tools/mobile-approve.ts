import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AgentPay } from '@useagentpay/sdk';
import { mapError } from '../errors.js';

export function registerMobileApproveTool(server: McpServer, ap: AgentPay) {
  server.tool(
    'agentpay_request_mobile_approval',
    'Send a mobile-friendly approval link to the user via Cloudflare Tunnel. Use this when mobileMode is ON. Requires cloudflared installed on the system.',
    {
      txId: z.string().describe('Transaction ID of a pending purchase'),
    },
    async ({ txId }) => {
      try {
        // Build notify options from config file, with env var overrides
        const cfg = ap.config.get();
        const notify: { command?: string; webhookUrl?: string } = {};
        notify.command = process.env.AGENTPAY_NOTIFY_COMMAND ?? cfg.notifyCommand;
        notify.webhookUrl = process.env.AGENTPAY_NOTIFY_WEBHOOK ?? cfg.notifyWebhook;

        const result = await ap.transactions.requestMobileApproval(txId, notify);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                txId,
                approvalUrl: result.approvalUrl,
                notifyResults: result.notifyResults,
                action: result.action,
                nextAction: result.action === 'approved'
                  ? `Approved! Call agentpay_execute_purchase with txId "${txId}".`
                  : `Rejected. ${result.reason ? `Reason: ${result.reason}` : 'No reason given.'}`,
              }),
            },
          ],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: JSON.stringify(mapError(err)) }] };
      }
    },
  );
}
