import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { TransactionManager } from './manager.js';
import type { PurchaseMandate } from '../auth/types.js';
import type { Receipt } from './types.js';

const mockMandate: PurchaseMandate = {
  txId: 'tx_test1234',
  txHash: 'abc123',
  signature: 'sig123',
  publicKey: 'pubkey123',
  timestamp: '2026-02-08T10:00:00.000Z',
};

const mockReceipt: Receipt = {
  id: 'rcpt_001',
  merchant: 'amazon.com',
  amount: 29.99,
  confirmationId: 'AMZ-12345',
  completedAt: '2026-02-08T10:06:00.000Z',
};

describe('TransactionManager', () => {
  let tmpDir: string;
  let tm: TransactionManager;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'agentpay-tx-test-'));
    tm = new TransactionManager(join(tmpDir, 'transactions.json'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('propose creates pending transaction', () => {
    const tx = tm.propose({
      merchant: 'amazon.com',
      amount: 29.99,
      description: 'Wireless mouse',
      url: 'https://amazon.com/dp/123',
    });
    expect(tx.status).toBe('pending');
    expect(tx.id).toMatch(/^tx_[0-9a-f]{8}$/);
    expect(tx.merchant).toBe('amazon.com');
    expect(tx.amount).toBe(29.99);
  });

  it('get retrieves a transaction', () => {
    const tx = tm.propose({ merchant: 'test.com', amount: 10, description: 'Test', url: 'https://test.com' });
    const retrieved = tm.get(tx.id);
    expect(retrieved).toEqual(tx);
  });

  it('approve changes status and stores mandate', () => {
    const tx = tm.propose({ merchant: 'test.com', amount: 10, description: 'Test', url: 'https://test.com' });
    tm.approve(tx.id, { ...mockMandate, txId: tx.id });
    const approved = tm.get(tx.id);
    expect(approved?.status).toBe('approved');
    expect(approved?.mandate).toBeDefined();
  });

  it('approve on non-pending throws', () => {
    const tx = tm.propose({ merchant: 'test.com', amount: 10, description: 'Test', url: 'https://test.com' });
    tm.reject(tx.id, 'nope');
    expect(() => tm.approve(tx.id, mockMandate)).toThrow();
  });

  it('reject changes status and stores reason', () => {
    const tx = tm.propose({ merchant: 'test.com', amount: 10, description: 'Test', url: 'https://test.com' });
    tm.reject(tx.id, 'too expensive');
    const rejected = tm.get(tx.id);
    expect(rejected?.status).toBe('rejected');
    expect(rejected?.rejectionReason).toBe('too expensive');
  });

  it('markExecuting on approved tx', () => {
    const tx = tm.propose({ merchant: 'test.com', amount: 10, description: 'Test', url: 'https://test.com' });
    tm.approve(tx.id, mockMandate);
    tm.markExecuting(tx.id);
    expect(tm.get(tx.id)?.status).toBe('executing');
  });

  it('markExecuting on pending throws (invalid transition)', () => {
    const tx = tm.propose({ merchant: 'test.com', amount: 10, description: 'Test', url: 'https://test.com' });
    expect(() => tm.markExecuting(tx.id)).toThrow();
  });

  it('markCompleted stores receipt', () => {
    const tx = tm.propose({ merchant: 'test.com', amount: 10, description: 'Test', url: 'https://test.com' });
    tm.approve(tx.id, mockMandate);
    tm.markExecuting(tx.id);
    tm.markCompleted(tx.id, mockReceipt);
    const completed = tm.get(tx.id);
    expect(completed?.status).toBe('completed');
    expect(completed?.receipt).toEqual(mockReceipt);
  });

  it('markFailed stores error', () => {
    const tx = tm.propose({ merchant: 'test.com', amount: 10, description: 'Test', url: 'https://test.com' });
    tm.approve(tx.id, mockMandate);
    tm.markExecuting(tx.id);
    tm.markFailed(tx.id, 'Checkout timeout');
    const failed = tm.get(tx.id);
    expect(failed?.status).toBe('failed');
    expect(failed?.error).toBe('Checkout timeout');
  });

  it('full lifecycle: pending → approved → executing → completed', () => {
    const tx = tm.propose({ merchant: 'amazon.com', amount: 29.99, description: 'Mouse', url: 'https://a.co' });
    expect(tx.status).toBe('pending');

    tm.approve(tx.id, mockMandate);
    expect(tm.get(tx.id)?.status).toBe('approved');

    tm.markExecuting(tx.id);
    expect(tm.get(tx.id)?.status).toBe('executing');

    tm.markCompleted(tx.id, mockReceipt);
    expect(tm.get(tx.id)?.status).toBe('completed');
  });

  it('getPending returns only pending', () => {
    const tx1 = tm.propose({ merchant: 'a.com', amount: 10, description: 'A', url: 'https://a.com' });
    const tx2 = tm.propose({ merchant: 'b.com', amount: 20, description: 'B', url: 'https://b.com' });
    tm.approve(tx1.id, mockMandate);

    const pending = tm.getPending();
    expect(pending.length).toBe(1);
    expect(pending[0].id).toBe(tx2.id);
  });

  it('getHistory excludes pending', () => {
    const tx1 = tm.propose({ merchant: 'a.com', amount: 10, description: 'A', url: 'https://a.com' });
    tm.propose({ merchant: 'b.com', amount: 20, description: 'B', url: 'https://b.com' });
    tm.approve(tx1.id, mockMandate);

    const history = tm.getHistory();
    expect(history.length).toBe(1);
    expect(history[0].status).toBe('approved');
  });
});
