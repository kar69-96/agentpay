import { TransactionManager } from '../transactions/manager.js';
import { AuditLogger } from '../audit/logger.js';

export function rejectCommand(txId: string, options: { reason?: string }): void {
  const tm = new TransactionManager();
  const audit = new AuditLogger();

  const tx = tm.get(txId);
  if (!tx) {
    console.error(`Transaction ${txId} not found.`);
    process.exit(1);
  }
  if (tx.status !== 'pending') {
    console.error(`Cannot reject transaction in '${tx.status}' state.`);
    process.exit(1);
  }

  tm.reject(txId, options.reason);
  audit.log('REJECT', { txId, reason: options.reason });

  console.log(`Rejected transaction ${txId}.${options.reason ? ` Reason: ${options.reason}` : ''}`);
}
