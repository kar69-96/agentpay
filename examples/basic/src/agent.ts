/**
 * Basic AgentPay Example
 *
 * Prerequisites:
 *   1. Run `agentpay setup` to create encrypted vault and keypair
 *   2. Run `agentpay budget --set 200` to set budget
 *   3. Set BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID env vars
 *
 * Usage:
 *   pnpm start
 */

import { AgentPay } from '@useagentpay/sdk';

async function main() {
  // Initialize AgentPay (reads from ~/.agentpay/)
  const ap = new AgentPay();

  // Check if setup is complete
  const status = ap.status();
  if (!status.isSetup) {
    console.error('AgentPay is not set up. Run `agentpay setup` first.');
    process.exit(1);
  }

  console.log(`Balance: $${status.balance.toFixed(2)} / $${status.budget.toFixed(2)}`);

  // Step 1: Agent proposes a purchase
  const tx = ap.transactions.propose({
    merchant: 'amazon.com',
    amount: 29.99,
    description: 'Wireless mouse for office',
    url: 'https://www.amazon.com/dp/B003NREDC8',
  });
  console.log(`\nProposed: ${tx.id} - ${tx.merchant} $${tx.amount}`);
  console.log('Waiting for human approval...');
  console.log(`Run: agentpay approve ${tx.id}`);

  // Step 2: Wait for human to approve via CLI
  const result = await ap.transactions.waitForApproval(tx.id, {
    pollInterval: 2000,
    timeout: 300_000, // 5 minutes
  });

  if (result.status === 'rejected') {
    console.log(`\nPurchase rejected: ${result.reason ?? 'No reason given'}`);
    return;
  }

  console.log('\nPurchase approved! Executing...');

  // Step 3: Execute the purchase (requires BROWSERBASE_API_KEY)
  // Uncomment below when you have Browserbase configured:
  // const receipt = await ap.transactions.execute(tx.id);
  // console.log(`\nPurchase complete!`);
  // console.log(`  Confirmation: ${receipt.confirmationId}`);
  // console.log(`  Amount: $${receipt.amount.toFixed(2)}`);

  console.log('\n(Execution skipped - set BROWSERBASE_API_KEY to enable)');
}

main().catch(console.error);
