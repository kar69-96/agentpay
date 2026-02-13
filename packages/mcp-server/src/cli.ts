import { Command } from 'commander';

declare const __PKG_VERSION__: string;
const VERSION = typeof __PKG_VERSION__ !== 'undefined' ? __PKG_VERSION__ : '0.0.0';

const program = new Command();

program
  .name('agentpay')
  .description('AgentPay – MCP server & CLI for AI agent payments')
  .version(VERSION);

program
  .command('init')
  .description('Initialize AgentPay in the current directory')
  .action(async () => {
    const { initCommand } = await import('./commands/init.js');
    initCommand();
  });

program
  .command('setup')
  .description('Set up AgentPay with your billing credentials')
  .action(async () => {
    const { setupCommand } = await import('./commands/setup.js');
    await setupCommand();
  });

program
  .command('budget')
  .description('View current spending budget (configure via dashboard)')
  .action(async () => {
    const { budgetCommand } = await import('./commands/budget.js');
    budgetCommand();
  });

program
  .command('pending')
  .description('List pending purchase proposals')
  .action(async () => {
    const { pendingCommand } = await import('./commands/pending.js');
    pendingCommand();
  });

program
  .command('propose')
  .description('Propose a purchase (creates a pending transaction)')
  .requiredOption('--merchant <name>', 'Merchant name')
  .requiredOption('--amount <amount>', 'Purchase amount in USD')
  .requiredOption('--description <desc>', 'Purchase description')
  .requiredOption('--url <url>', 'Product/checkout URL')
  .action(async (options: { merchant: string; amount: string; description: string; url: string }) => {
    const { proposeCommand } = await import('./commands/propose.js');
    proposeCommand(options);
  });

program
  .command('approve <txId>')
  .description('Approve a pending purchase')
  .action(async (txId: string) => {
    const { approveCommand } = await import('./commands/approve.js');
    await approveCommand(txId);
  });

program
  .command('reject <txId>')
  .description('Reject a pending purchase')
  .option('--reason <reason>', 'Reason for rejection')
  .action(async (txId: string, options: { reason?: string }) => {
    const { rejectCommand } = await import('./commands/reject.js');
    rejectCommand(txId, options);
  });

program
  .command('status')
  .description('Show wallet status and recent transactions')
  .action(async () => {
    const { statusCommand } = await import('./commands/status.js');
    statusCommand();
  });

program
  .command('history')
  .description('Show full transaction history')
  .action(async () => {
    const { historyCommand } = await import('./commands/history.js');
    historyCommand();
  });

program
  .command('reset')
  .description('Delete all AgentPay data')
  .action(async () => {
    const { resetCommand } = await import('./commands/reset.js');
    await resetCommand();
  });

program
  .command('dashboard')
  .description('Open the AgentPay dashboard in your browser')
  .option('--port <port>', 'Port for dashboard server', '3141')
  .action(async (options: { port: string }) => {
    const { dashboardCommand } = await import('./commands/dashboard.js');
    await dashboardCommand(options);
  });

program
  .command('mobile <on|off>')
  .description('Enable or disable mobile approval mode (Cloudflare Tunnel)')
  .option('--notify-command <cmd>', 'Shell command to send notification ({{url}} = approval link)')
  .option('--notify-webhook <url>', 'Webhook URL to POST approval payload to')
  .action(async (mode: string, options: { notifyCommand?: string; notifyWebhook?: string }) => {
    const { mobileCommand } = await import('./commands/mobile.js');
    mobileCommand(mode, options);
  });

program
  .command('serve')
  .description('Start AgentPay MCP server')
  .option('--http', 'Use HTTP transport instead of stdio')
  .action(async (options: { http?: boolean }) => {
    const { serveCommand } = await import('./commands/serve.js');
    await serveCommand(options);
  });

program.parse();
