import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AgentPay } from '@useagentpay/sdk';
import type { ServerConfig } from '../config.js';
import { getPassphrase } from '../config.js';
import { mapError } from '../errors.js';

export function registerExecuteTool(server: McpServer, ap: AgentPay, config: ServerConfig) {
  server.tool(
    'agentpay_execute_purchase',
    'Execute an approved purchase. Requires passphrase config. Decrypts credentials and completes checkout via browser.',
    {
      txId: z.string().describe('Transaction ID of an approved purchase'),
    },
    async ({ txId }) => {
      try {
        const passphrase = await getPassphrase(config);

        // Create a temporary instance with passphrase for execution
        const execAp = new AgentPay({
          home: ap.home,
          passphrase,
          executor: config.executor,
        });

        const receipt = await execAp.transactions.execute(txId);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                receipt,
                nextAction: 'DONE - Purchase completed. Use agentpay_get_receipt for details.',
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
