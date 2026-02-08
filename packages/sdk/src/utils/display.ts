import type { Transaction } from '../transactions/types.js';

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTable(transactions: Transaction[]): string {
  if (transactions.length === 0) return 'No transactions.';

  const header = 'TX_ID         MERCHANT        AMOUNT    DESCRIPTION';
  const separator = '─'.repeat(header.length);
  const rows = transactions.map((tx) => {
    const id = tx.id.padEnd(14);
    const merchant = tx.merchant.padEnd(16);
    const amount = formatCurrency(tx.amount).padStart(9);
    return `${id}${merchant}${amount}    ${tx.description}`;
  });

  return [header, separator, ...rows].join('\n');
}

export function formatStatus(data: {
  balance: number;
  budget: number;
  limitPerTx: number;
  pending: Transaction[];
  recent: Transaction[];
}): string {
  const lines = [
    'AgentPay Status',
    '───────────────',
    `Balance:            ${formatCurrency(data.balance)} / ${formatCurrency(data.budget)}`,
    `Per-tx limit:       ${formatCurrency(data.limitPerTx)}`,
    `Pending purchases:  ${data.pending.length}`,
  ];

  if (data.recent.length > 0) {
    lines.push('', 'Recent:');
    for (const tx of data.recent) {
      const status = `[${tx.status}]`.padEnd(12);
      lines.push(`  ${status} ${tx.id}  ${tx.merchant.padEnd(12)} ${formatCurrency(tx.amount).padStart(8)}  ${tx.description}`);
    }
  }

  return lines.join('\n');
}
