#!/usr/bin/env node
import { Command } from 'commander';
import { VERSION } from './index.js';

const program = new Command();

program
  .name('agentpay')
  .description('Local-first payments SDK for AI agents')
  .version(VERSION);

program
  .command('setup')
  .description('Set up AgentPay with your billing credentials')
  .action(async () => {
    const { setupCommand } = await import('./commands/setup.js');
    await setupCommand();
  });

program
  .command('budget')
  .description('View or configure spending budget')
  .option('--set <amount>', 'Set total budget')
  .option('--limit-per-tx <amount>', 'Set per-transaction limit')
  .action(async (options) => {
    const { budgetCommand } = await import('./commands/budget.js');
    budgetCommand(options);
  });

program
  .command('pending')
  .description('List pending purchase proposals')
  .action(async () => {
    const { pendingCommand } = await import('./commands/pending.js');
    pendingCommand();
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
  .command('qr')
  .description('Display QR code for web-based setup')
  .option('--budget <amount>', 'Suggested budget amount')
  .option('--message <msg>', 'Message to display on setup page')
  .action(async (options: { budget?: string; message?: string }) => {
    const { qrCommand } = await import('./commands/qr.js');
    await qrCommand(options);
  });

program
  .command('reset')
  .description('Delete all AgentPay data')
  .action(async () => {
    const { resetCommand } = await import('./commands/reset.js');
    await resetCommand();
  });

program
  .command('buy')
  .description('Propose, approve, and execute a purchase')
  .requiredOption('--merchant <name>', 'Merchant name')
  .requiredOption('--description <desc>', 'Purchase description')
  .requiredOption('--url <url>', 'Product/checkout URL')
  .option('--amount <amount>', 'Purchase amount (auto-detected from page if omitted)')
  .option('--pickup', 'Select in-store pickup')
  .action(async (options: { merchant: string; description: string; url: string; amount?: string; pickup?: boolean }) => {
    const { buyCommand } = await import('./commands/buy.js');
    await buyCommand(options);
  });

program
  .command('dashboard')
  .description('Open the AgentPay dashboard in your browser')
  .option('--port <port>', 'Port for dashboard server', '3141')
  .action(async (options: { port: string }) => {
    const { dashboardCommand } = await import('./commands/dashboard.js');
    await dashboardCommand(options);
  });

program.parse();
