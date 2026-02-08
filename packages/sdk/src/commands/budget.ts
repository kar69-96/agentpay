import { BudgetManager } from '../budget/budget.js';
import { AuditLogger } from '../audit/logger.js';
import { formatCurrency } from '../utils/display.js';

export function budgetCommand(options: { set?: string; limitPerTx?: string }): void {
  const bm = new BudgetManager();
  const audit = new AuditLogger();

  if (options.set) {
    const amount = parseFloat(options.set);
    if (isNaN(amount) || amount < 0) {
      console.error('Invalid amount. Provide a positive number.');
      process.exit(1);
    }
    bm.setBudget(amount);
    audit.log('BUDGET_SET', { amount });
    console.log(`Budget set to ${formatCurrency(amount)}.`);
  }

  if (options.limitPerTx) {
    const limit = parseFloat(options.limitPerTx);
    if (isNaN(limit) || limit < 0) {
      console.error('Invalid limit. Provide a positive number.');
      process.exit(1);
    }
    bm.setLimitPerTx(limit);
    audit.log('LIMIT_SET', { limitPerTx: limit });
    console.log(`Per-transaction limit set to ${formatCurrency(limit)}.`);
  }

  if (!options.set && !options.limitPerTx) {
    const balance = bm.getBalance();
    console.log(`Budget:     ${formatCurrency(balance.budget)}`);
    console.log(`Balance:    ${formatCurrency(balance.balance)}`);
    console.log(`Spent:      ${formatCurrency(balance.spent)}`);
    console.log(`Per-tx limit: ${balance.limitPerTx > 0 ? formatCurrency(balance.limitPerTx) : 'None'}`);
  }
}
