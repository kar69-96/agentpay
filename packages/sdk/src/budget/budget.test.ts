import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { BudgetManager } from './budget.js';
import { NotSetupError, InsufficientBalanceError, ExceedsTxLimitError } from '../errors.js';

describe('BudgetManager', () => {
  let tmpDir: string;
  let bm: BudgetManager;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'agentpay-budget-test-'));
    bm = new BudgetManager(join(tmpDir, 'wallet.json'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('getWallet throws NotSetupError on missing file', () => {
    expect(() => bm.getWallet()).toThrow(NotSetupError);
  });

  it('setBudget creates wallet', () => {
    bm.setBudget(200);
    const wallet = bm.getWallet();
    expect(wallet).toEqual({ budget: 200, balance: 200, limitPerTx: 0, spent: 0 });
  });

  it('setLimitPerTx updates limit', () => {
    bm.setBudget(200);
    bm.setLimitPerTx(50);
    expect(bm.getWallet().limitPerTx).toBe(50);
  });

  it('deductBalance reduces balance', () => {
    bm.setBudget(200);
    bm.deductBalance(30);
    const wallet = bm.getWallet();
    expect(wallet.balance).toBe(170);
    expect(wallet.spent).toBe(30);
  });

  it('deductBalance throws on insufficient funds', () => {
    bm.setBudget(200);
    expect(() => bm.deductBalance(250)).toThrow(InsufficientBalanceError);
  });

  it('checkProposal passes when within limits', () => {
    bm.setBudget(200);
    bm.setLimitPerTx(50);
    expect(() => bm.checkProposal(40)).not.toThrow();
  });

  it('checkProposal throws ExceedsTxLimitError', () => {
    bm.setBudget(200);
    bm.setLimitPerTx(50);
    expect(() => bm.checkProposal(60)).toThrow(ExceedsTxLimitError);
  });

  it('checkProposal throws InsufficientBalanceError', () => {
    bm.setBudget(200);
    expect(() => bm.checkProposal(300)).toThrow(InsufficientBalanceError);
  });

  it('getBalance returns current state', () => {
    bm.setBudget(200);
    bm.setLimitPerTx(50);
    bm.deductBalance(30);
    const balance = bm.getBalance();
    expect(balance).toEqual({ budget: 200, balance: 170, limitPerTx: 50, spent: 30 });
  });

  it('initWallet creates fresh wallet', () => {
    bm.initWallet(500, 100);
    expect(bm.getWallet()).toEqual({ budget: 500, balance: 500, limitPerTx: 100, spent: 0 });
  });
});
