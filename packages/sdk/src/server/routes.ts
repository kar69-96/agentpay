import { existsSync, mkdirSync } from 'node:fs';
import { encrypt, saveVault } from '../vault/vault.js';
import { generateKeyPair, saveKeyPair } from '../auth/keypair.js';
import { BudgetManager } from '../budget/budget.js';
import { TransactionManager } from '../transactions/manager.js';
import { AuditLogger } from '../audit/logger.js';
import { getCredentialsPath, getHomePath, getKeysPath } from '../utils/paths.js';
import type { BillingCredentials } from '../vault/types.js';

interface RouteResult {
  status: number;
  body: Record<string, unknown>;
}

export function handleGetStatus(): RouteResult {
  const isSetup = existsSync(getCredentialsPath());

  if (!isSetup) {
    return { status: 200, body: { isSetup: false } };
  }

  try {
    const bm = new BudgetManager();
    const wallet = bm.getBalance();
    const tm = new TransactionManager();
    const recent = tm.list().slice(-10).reverse();

    return {
      status: 200,
      body: { isSetup: true, wallet, recentTransactions: recent },
    };
  } catch {
    return { status: 200, body: { isSetup: true, wallet: null, recentTransactions: [] } };
  }
}

interface SetupBody {
  passphrase: string;
  credentials: BillingCredentials;
  budget: number;
  limitPerTx: number;
}

export function handlePostSetup(body: SetupBody): RouteResult {
  if (!body.passphrase || !body.credentials) {
    return { status: 400, body: { error: 'Missing passphrase or credentials' } };
  }

  try {
    const home = getHomePath();
    mkdirSync(home, { recursive: true });

    // Encrypt and save vault
    const vault = encrypt(body.credentials, body.passphrase);
    saveVault(vault, getCredentialsPath());

    // Generate and save keypair
    const keys = generateKeyPair(body.passphrase);
    mkdirSync(getKeysPath(), { recursive: true });
    saveKeyPair(keys);

    // Initialize wallet
    const bm = new BudgetManager();
    bm.initWallet(body.budget || 0, body.limitPerTx || 0);

    // Audit
    const audit = new AuditLogger();
    audit.log('SETUP', { source: 'dashboard', message: 'credentials encrypted, keypair generated, wallet initialized' });

    const wallet = bm.getBalance();
    return { status: 200, body: { success: true, wallet } };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Setup failed';
    return { status: 500, body: { error: message } };
  }
}

interface FundBody {
  amount: number;
}

export function handlePostFund(body: FundBody): RouteResult {
  if (!body.amount || body.amount <= 0) {
    return { status: 400, body: { error: 'Amount must be positive' } };
  }

  try {
    const bm = new BudgetManager();
    const wallet = bm.addFunds(body.amount);

    const audit = new AuditLogger();
    audit.log('ADD_FUNDS', { source: 'dashboard', amount: body.amount });

    return { status: 200, body: { success: true, wallet } };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add funds';
    return { status: 500, body: { error: message } };
  }
}
