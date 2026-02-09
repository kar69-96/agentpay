import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AgentPay } from 'agentpay';

export function registerWalletResource(server: McpServer, ap: AgentPay) {
  server.resource('wallet', 'agentpay://wallet', async () => {
    try {
      const wallet = ap.wallet.getBalance();
      return {
        contents: [
          {
            uri: 'agentpay://wallet',
            mimeType: 'application/json',
            text: JSON.stringify(wallet, null, 2),
          },
        ],
      };
    } catch {
      return {
        contents: [
          {
            uri: 'agentpay://wallet',
            mimeType: 'application/json',
            text: JSON.stringify({ budget: 0, balance: 0, limitPerTx: 0, spent: 0 }),
          },
        ],
      };
    }
  });
}
