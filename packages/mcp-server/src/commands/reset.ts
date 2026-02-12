import { rmSync, existsSync } from 'node:fs';
import { getHomePath, promptInput } from '@useagentpay/sdk';

export async function resetCommand(): Promise<void> {
  const home = getHomePath();

  if (!existsSync(home)) {
    console.log('Nothing to reset. AgentPay data directory does not exist.');
    return;
  }

  console.log(`This will permanently delete all AgentPay data at: ${home}`);
  console.log('This includes encrypted credentials, keys, wallet, transactions, and audit logs.');
  const answer = await promptInput('\nType YES to confirm: ');

  if (answer !== 'YES') {
    console.log('Cancelled.');
    return;
  }

  rmSync(home, { recursive: true, force: true });
  console.log('All AgentPay data has been deleted.');
}
