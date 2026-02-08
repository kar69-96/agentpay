import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Wallet } from './types.js';
import { NotSetupError, InsufficientBalanceError, ExceedsTxLimitError } from '../errors.js';
import { getWalletPath } from '../utils/paths.js';

export class BudgetManager {
  private walletPath: string;

  constructor(walletPath?: string) {
    this.walletPath = walletPath ?? getWalletPath();
  }

  getWallet(): Wallet {
    try {
      const data = readFileSync(this.walletPath, 'utf8');
      return JSON.parse(data) as Wallet;
    } catch {
      throw new NotSetupError();
    }
  }

  private saveWallet(wallet: Wallet): void {
    mkdirSync(dirname(this.walletPath), { recursive: true });
    writeFileSync(this.walletPath, JSON.stringify(wallet, null, 2), { mode: 0o600 });
  }

  setBudget(amount: number): void {
    let wallet: Wallet;
    try {
      wallet = this.getWallet();
    } catch {
      wallet = { budget: 0, balance: 0, limitPerTx: 0, spent: 0 };
    }
    wallet.budget = amount;
    wallet.balance = amount - wallet.spent;
    this.saveWallet(wallet);
  }

  setLimitPerTx(limit: number): void {
    const wallet = this.getWallet();
    wallet.limitPerTx = limit;
    this.saveWallet(wallet);
  }

  deductBalance(amount: number): void {
    const wallet = this.getWallet();
    if (amount > wallet.balance) {
      throw new InsufficientBalanceError(amount, wallet.balance);
    }
    wallet.balance -= amount;
    wallet.spent += amount;
    this.saveWallet(wallet);
  }

  checkProposal(amount: number): void {
    const wallet = this.getWallet();
    if (amount > wallet.balance) {
      throw new InsufficientBalanceError(amount, wallet.balance);
    }
    if (wallet.limitPerTx > 0 && amount > wallet.limitPerTx) {
      throw new ExceedsTxLimitError(amount, wallet.limitPerTx);
    }
  }

  addFunds(amount: number): Wallet {
    const wallet = this.getWallet();
    wallet.budget += amount;
    wallet.balance += amount;
    this.saveWallet(wallet);
    return wallet;
  }

  getBalance(): { budget: number; balance: number; limitPerTx: number; spent: number } {
    const wallet = this.getWallet();
    return {
      budget: wallet.budget,
      balance: wallet.balance,
      limitPerTx: wallet.limitPerTx,
      spent: wallet.spent,
    };
  }

  initWallet(budget: number, limitPerTx: number = 0): void {
    const wallet: Wallet = { budget, balance: budget, limitPerTx, spent: 0 };
    this.saveWallet(wallet);
  }
}
