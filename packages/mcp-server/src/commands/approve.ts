import {
  TransactionManager,
  AuditLogger,
  formatCurrency,
  requestBrowserApproval,
} from '@useagentpay/sdk';

export async function approveCommand(txId: string): Promise<void> {
  const tm = new TransactionManager();
  const audit = new AuditLogger();

  const tx = tm.get(txId);
  if (!tx) {
    console.error(`Transaction ${txId} not found.`);
    process.exit(1);
  }
  if (tx.status !== 'pending') {
    console.error(`Cannot approve transaction in '${tx.status}' state.`);
    process.exit(1);
  }

  console.log(`Approve purchase:`);
  console.log(`  Merchant:    ${tx.merchant}`);
  console.log(`  Amount:      ${formatCurrency(tx.amount)}`);
  console.log(`  Description: ${tx.description}`);
  console.log();

  const result = await requestBrowserApproval(tx, tm, audit);

  if (result.action === 'rejected') {
    console.log(`Purchase denied${result.reason ? ': ' + result.reason : '.'}`);
    process.exit(0);
  }

  console.log(`\nApproved! Transaction ${txId} is now ready for execution.`);
}
