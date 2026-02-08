import { TransactionManager } from '../transactions/manager.js';
import { formatCurrency, formatTimestamp } from '../utils/display.js';

export function historyCommand(): void {
  const tm = new TransactionManager();
  const history = tm.getHistory();

  if (history.length === 0) {
    console.log('No transaction history.');
    return;
  }

  console.log('Transaction History:');
  console.log('─────────────────────');
  console.log('STATUS       TX_ID         MERCHANT        AMOUNT    DATE              DESCRIPTION');

  for (const tx of history) {
    const status = `[${tx.status}]`.padEnd(13);
    const id = tx.id.padEnd(14);
    const merchant = tx.merchant.padEnd(16);
    const amount = formatCurrency(tx.amount).padStart(9);
    const date = formatTimestamp(tx.createdAt).padEnd(18);
    console.log(`${status}${id}${merchant}${amount}    ${date}${tx.description}`);
  }
}
