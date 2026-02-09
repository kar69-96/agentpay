import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';
import { loadConfig } from './config.js';

export { createServer } from './server.js';
export { loadConfig } from './config.js';
export type { ServerConfig } from './config.js';

export async function startServer(overrides?: { http?: boolean }) {
  const config = loadConfig(overrides);
  const server = createServer(config);

  if (config.http) {
    // Dynamic import to avoid loading HTTP deps when not needed
    const { createServer: createHttpServer } = await import('node:http');
    const { StreamableHTTPServerTransport } = await import(
      '@modelcontextprotocol/sdk/server/streamableHttp.js'
    );

    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => crypto.randomUUID() });
    await server.connect(transport);

    const httpServer = createHttpServer((req, res) => {
      transport.handleRequest(req, res);
    });

    const port = parseInt(process.env.MCP_HTTP_PORT ?? '3100', 10);
    httpServer.listen(port, () => {
      console.error(`AgentPay MCP server listening on http://localhost:${port}`);
    });

    const shutdown = () => {
      httpServer.close();
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);

    const shutdown = async () => {
      await server.close();
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }
}

// Auto-start when run directly
const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('/mcp-server/dist/index.js') ||
    process.argv[1].endsWith('/mcp-server/src/index.ts'));

if (isDirectRun) {
  const httpFlag = process.argv.includes('--http');
  startServer({ http: httpFlag }).catch((err) => {
    console.error('Failed to start MCP server:', err);
    process.exit(1);
  });
}
