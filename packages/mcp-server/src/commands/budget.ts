import { BudgetManager, formatCurrency } from '@useagentpay/sdk';

export function budgetCommand(): void {
  const bm = new BudgetManager();
  const balance = bm.getBalance();
  console.log(`Budget:       ${formatCurrency(balance.budget)}`);
  console.log(`Balance:      ${formatCurrency(balance.balance)}`);
  console.log(`Spent:        ${formatCurrency(balance.spent)}`);
  console.log(`Per-tx limit: ${balance.limitPerTx > 0 ? formatCurrency(balance.limitPerTx) : 'None'}`);
}
