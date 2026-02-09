import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AgentPay } from '@useagentpay/sdk';

export function registerTransactionResource(server: McpServer, ap: AgentPay) {
  server.resource(
    'transaction',
    new ResourceTemplate('agentpay://transactions/{txId}', { list: undefined }),
    async (uri, { txId }) => {
      const tx = ap.transactions.get(txId as string);
      if (!tx) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'Transaction not found' }),
            },
          ],
        };
      }

      // Omit mandate internals for security
      const { mandate: _, ...safeTx } = tx;
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(safeTx, null, 2),
          },
        ],
      };
    }
  );
}
