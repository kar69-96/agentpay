import { TransactionManager } from '../transactions/manager.js';
import { loadPrivateKey, loadPublicKey } from '../auth/keypair.js';
import { createMandate } from '../auth/mandate.js';
import { AuditLogger } from '../audit/logger.js';
import { promptPassphraseSafe } from '../utils/prompt.js';
import { formatCurrency } from '../utils/display.js';
import type { TransactionDetails } from '../auth/types.js';

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

  const passphrase = await promptPassphraseSafe({
    action: 'approve',
    merchant: tx.merchant,
    amount: tx.amount,
    description: tx.description,
    txId,
  });

  try {
    const privateKeyPem = loadPrivateKey();
    const txDetails: TransactionDetails = {
      txId: tx.id,
      merchant: tx.merchant,
      amount: tx.amount,
      description: tx.description,
      timestamp: tx.createdAt,
    };

    const mandate = createMandate(txDetails, privateKeyPem, passphrase);
    tm.approve(txId, mandate);
    audit.log('APPROVE', { txId, mandateSigned: true });

    console.log(`\nApproved! Transaction ${txId} is now ready for execution.`);
  } catch (err) {
    console.error(`Failed to approve: ${err instanceof Error ? err.message : 'Unknown error'}`);
    process.exit(1);
  }
}
