import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Transaction, Receipt, ProposeOptions } from './types.js';
import type { PurchaseMandate } from '../auth/types.js';
import { generateTxId } from '../utils/ids.js';
import { getTransactionsPath } from '../utils/paths.js';

export class TransactionManager {
  private txPath: string;

  constructor(txPath?: string) {
    this.txPath = txPath ?? getTransactionsPath();
  }

  private loadAll(): Transaction[] {
    try {
      const data = readFileSync(this.txPath, 'utf8');
      return JSON.parse(data) as Transaction[];
    } catch {
      return [];
    }
  }

  private saveAll(transactions: Transaction[]): void {
    mkdirSync(dirname(this.txPath), { recursive: true });
    writeFileSync(this.txPath, JSON.stringify(transactions, null, 2), { mode: 0o600 });
  }

  propose(options: ProposeOptions): Transaction {
    const transactions = this.loadAll();
    const tx: Transaction = {
      id: generateTxId(),
      status: 'pending',
      merchant: options.merchant,
      amount: options.amount,
      description: options.description,
      url: options.url,
      createdAt: new Date().toISOString(),
    };
    transactions.push(tx);
    this.saveAll(transactions);
    return tx;
  }

  get(txId: string): Transaction | undefined {
    return this.loadAll().find((tx) => tx.id === txId);
  }

  approve(txId: string, mandate: PurchaseMandate): void {
    const transactions = this.loadAll();
    const tx = transactions.find((t) => t.id === txId);
    if (!tx) throw new Error(`Transaction ${txId} not found.`);
    if (tx.status !== 'pending') throw new Error(`Cannot approve transaction in '${tx.status}' state.`);
    tx.status = 'approved';
    tx.mandate = mandate;
    this.saveAll(transactions);
  }

  reject(txId: string, reason?: string): void {
    const transactions = this.loadAll();
    const tx = transactions.find((t) => t.id === txId);
    if (!tx) throw new Error(`Transaction ${txId} not found.`);
    if (tx.status !== 'pending') throw new Error(`Cannot reject transaction in '${tx.status}' state.`);
    tx.status = 'rejected';
    tx.rejectionReason = reason;
    this.saveAll(transactions);
  }

  markExecuting(txId: string): void {
    const transactions = this.loadAll();
    const tx = transactions.find((t) => t.id === txId);
    if (!tx) throw new Error(`Transaction ${txId} not found.`);
    if (tx.status !== 'approved') throw new Error(`Cannot execute transaction in '${tx.status}' state.`);
    tx.status = 'executing';
    this.saveAll(transactions);
  }

  markCompleted(txId: string, receipt: Receipt): void {
    const transactions = this.loadAll();
    const tx = transactions.find((t) => t.id === txId);
    if (!tx) throw new Error(`Transaction ${txId} not found.`);
    if (tx.status !== 'executing') throw new Error(`Cannot complete transaction in '${tx.status}' state.`);
    tx.status = 'completed';
    tx.receipt = receipt;
    this.saveAll(transactions);
  }

  markFailed(txId: string, error: string): void {
    const transactions = this.loadAll();
    const tx = transactions.find((t) => t.id === txId);
    if (!tx) throw new Error(`Transaction ${txId} not found.`);
    if (tx.status !== 'executing') throw new Error(`Cannot fail transaction in '${tx.status}' state.`);
    tx.status = 'failed';
    tx.error = error;
    this.saveAll(transactions);
  }

  list(): Transaction[] {
    return this.loadAll();
  }

  getPending(): Transaction[] {
    return this.loadAll().filter((tx) => tx.status === 'pending');
  }

  getHistory(): Transaction[] {
    return this.loadAll().filter((tx) => tx.status !== 'pending');
  }
}
