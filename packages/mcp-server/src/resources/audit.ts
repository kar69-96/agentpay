import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AgentPay } from '@useagentpay/sdk';

export function registerAuditResource(server: McpServer, ap: AgentPay) {
  server.resource('audit-log', 'agentpay://audit-log', async () => {
    const lines = ap.audit.getLog();
    const last50 = lines.slice(-50);

    const entries = last50.map((line) => {
      const parts = line.split('\t');
      return {
        timestamp: parts[0] ?? '',
        action: parts[1] ?? '',
        details: parts[2] ? JSON.parse(parts[2]) : {},
      };
    });

    return {
      contents: [
        {
          uri: 'agentpay://audit-log',
          mimeType: 'application/json',
          text: JSON.stringify(entries, null, 2),
        },
      ],
    };
  });
}
