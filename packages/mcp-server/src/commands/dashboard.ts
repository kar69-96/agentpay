import { startDashboardServer, openBrowser } from '@useagentpay/sdk';

export async function dashboardCommand(options: { port: string }): Promise<void> {
  const port = parseInt(options.port, 10) || 3141;
  const url = `http://127.0.0.1:${port}`;

  try {
    const server = await startDashboardServer(port);

    console.log(`AgentPay Dashboard running at ${url}`);
    console.log('Press Ctrl+C to stop.\n');

    openBrowser(url);

    const shutdown = () => {
      console.log('\nShutting down dashboard...');
      server.close(() => process.exit(0));
      // Force exit after 3 seconds if connections linger
      setTimeout(() => process.exit(0), 3000);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start server';
    console.error(message);
    process.exit(1);
  }
}
