import type { Transaction } from './types.js';
import type { TransactionManager } from './manager.js';
import { TimeoutError } from '../errors.js';

export interface PollOptions {
  pollInterval?: number;
  timeout?: number;
}

export async function waitForApproval(
  txId: string,
  manager: TransactionManager,
  options?: PollOptions,
): Promise<{ status: 'approved' | 'rejected'; reason?: string }> {
  const interval = options?.pollInterval ?? 2000;
  const timeout = options?.timeout ?? 300_000;
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const tx = manager.get(txId);
    if (!tx) throw new Error(`Transaction ${txId} not found.`);

    if (tx.status === 'approved') return { status: 'approved' };
    if (tx.status === 'rejected') return { status: 'rejected', reason: tx.rejectionReason };

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new TimeoutError(`Timed out waiting for approval of ${txId}`);
}
