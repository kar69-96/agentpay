import { AgentPay, formatStatus } from '@useagentpay/sdk';

export function statusCommand(): void {
  const ap = new AgentPay();
  const s = ap.status();

  if (!s.isSetup) {
    console.log('AgentPay is not set up. Run `agentpay setup` first.');
    return;
  }

  console.log(formatStatus({
    balance: s.balance,
    budget: s.budget,
    limitPerTx: s.limitPerTx,
    pending: s.pending,
    recent: s.recent,
  }));
}
