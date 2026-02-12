import {
  BudgetManager,
  TransactionManager,
  AuditLogger,
  formatCurrency,
} from '@useagentpay/sdk';

interface ProposeOptions {
  merchant: string;
  amount: string;
  description: string;
  url: string;
}

export function proposeCommand(options: ProposeOptions): void {
  const amount = parseFloat(options.amount);
  if (isNaN(amount) || amount <= 0) {
    console.error('Invalid amount. Must be a positive number.');
    process.exit(1);
  }

  const bm = new BudgetManager();
  const tm = new TransactionManager();
  const audit = new AuditLogger();

  try {
    bm.checkProposal(amount);
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Budget check failed.');
    process.exit(1);
  }

  const tx = tm.propose({
    merchant: options.merchant,
    amount,
    description: options.description,
    url: options.url,
  });
  audit.log('PROPOSE', { txId: tx.id, merchant: tx.merchant, amount: tx.amount, source: 'propose-command' });

  console.log('Transaction proposed');
  console.log('════════════════════\n');
  console.log(`  ID:          ${tx.id}`);
  console.log(`  Merchant:    ${tx.merchant}`);
  console.log(`  Amount:      ${formatCurrency(tx.amount)}`);
  console.log(`  Description: ${tx.description}`);
  console.log(`  URL:         ${options.url}`);
  console.log(`  Status:      ${tx.status}`);
  console.log();
  console.log(`Next step: agentpay approve ${tx.id}`);
}
