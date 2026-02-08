import { TransactionManager } from '../transactions/manager.js';
import { formatCurrency } from '../utils/display.js';

export function pendingCommand(): void {
  const tm = new TransactionManager();
  const pending = tm.getPending();

  if (pending.length === 0) {
    console.log('No pending purchases.');
    return;
  }

  console.log('Pending Purchases:');
  console.log('─────────────────');
  console.log('TX_ID         MERCHANT        AMOUNT    DESCRIPTION');

  for (const tx of pending) {
    const id = tx.id.padEnd(14);
    const merchant = tx.merchant.padEnd(16);
    const amount = formatCurrency(tx.amount).padStart(9);
    console.log(`${id}${merchant}${amount}    ${tx.description}`);
  }

  console.log(`\n${pending.length} pending purchase${pending.length === 1 ? '' : 's'}. Use 'agentpay approve <txId>' or 'agentpay reject <txId>'.`);
}
