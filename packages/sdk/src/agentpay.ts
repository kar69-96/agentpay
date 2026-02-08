import { join } from 'node:path';
import { BudgetManager } from './budget/budget.js';
import { TransactionManager } from './transactions/manager.js';
import { AuditLogger } from './audit/logger.js';
import { PurchaseExecutor } from './executor/executor.js';
import { verifyMandate } from './auth/mandate.js';
import { decrypt, loadVault } from './vault/vault.js';
import { getHomePath } from './utils/paths.js';
import {
  NotApprovedError,
  InvalidMandateError,
  InsufficientBalanceError,
  AlreadyExecutedError,
} from './errors.js';
import type { Transaction, Receipt, ProposeOptions } from './transactions/types.js';
import type { TransactionDetails } from './auth/types.js';
import type { ExecutorConfig } from './executor/types.js';

export interface AgentPayOptions {
  home?: string;
  passphrase?: string;
  executor?: ExecutorConfig;
}

export class AgentPay {
  private home: string;
  private passphrase?: string;
  private budgetManager: BudgetManager;
  private txManager: TransactionManager;
  private auditLogger: AuditLogger;
  private executor: PurchaseExecutor;

  constructor(options?: AgentPayOptions) {
    this.home = options?.home ?? getHomePath();
    this.passphrase = options?.passphrase;
    this.budgetManager = new BudgetManager(join(this.home, 'wallet.json'));
    this.txManager = new TransactionManager(join(this.home, 'transactions.json'));
    this.auditLogger = new AuditLogger(join(this.home, 'audit.log'));
    this.executor = new PurchaseExecutor(options?.executor);
  }

  get wallet() {
    const bm = this.budgetManager;
    return {
      getBalance: () => bm.getBalance(),
      getHistory: () => this.txManager.getHistory(),
      getLimits: () => {
        const w = bm.getBalance();
        return { budget: w.budget, limitPerTx: w.limitPerTx, remaining: w.balance };
      },
      generateFundingQR: async (options?: { suggestedBudget?: number; message?: string }) => {
        const QRCode = await import('qrcode');
        const params = new URLSearchParams();
        if (options?.suggestedBudget) params.set('budget', String(options.suggestedBudget));
        if (options?.message) params.set('msg', options.message);
        const baseUrl = process.env.AGENTPAY_WEB_URL ?? 'http://localhost:3000';
        const url = `${baseUrl}/setup${params.toString() ? `?${params.toString()}` : ''}`;
        const qrDataUrl = await QRCode.toDataURL(url);
        return { url, qrDataUrl };
      },
    };
  }

  get transactions() {
    return {
      propose: (options: ProposeOptions): Transaction => {
        this.budgetManager.checkProposal(options.amount);
        const tx = this.txManager.propose(options);
        this.auditLogger.log('PROPOSE', { txId: tx.id, merchant: tx.merchant, amount: tx.amount });
        return tx;
      },
      get: (txId: string) => this.txManager.get(txId),
      waitForApproval: async (txId: string, options?: { pollInterval?: number; timeout?: number }) => {
        const { waitForApproval } = await import('./transactions/poller.js');
        return waitForApproval(txId, this.txManager, options);
      },
      execute: async (txId: string): Promise<Receipt> => {
        const tx = this.txManager.get(txId);
        if (!tx) throw new Error(`Transaction ${txId} not found.`);

        // Validate state
        if (tx.status === 'completed' || tx.status === 'failed') {
          throw new AlreadyExecutedError(txId);
        }
        if (tx.status !== 'approved') {
          throw new NotApprovedError(txId);
        }
        if (!tx.mandate) {
          throw new InvalidMandateError('No mandate found on approved transaction.');
        }

        // Verify mandate
        const txDetails: TransactionDetails = {
          txId: tx.id,
          merchant: tx.merchant,
          amount: tx.amount,
          description: tx.description,
          timestamp: tx.createdAt,
        };
        if (!verifyMandate(tx.mandate, txDetails)) {
          throw new InvalidMandateError();
        }

        // Check balance
        this.budgetManager.checkProposal(tx.amount);

        // Mark executing
        this.txManager.markExecuting(txId);
        this.auditLogger.log('EXECUTE', { txId, browserbaseSessionStarted: true });

        try {
          // Decrypt credentials
          if (!this.passphrase) {
            throw new Error('Passphrase required for execution. Pass it to AgentPay constructor.');
          }
          const vaultPath = join(this.home, 'credentials.enc');
          const vault = loadVault(vaultPath);
          const credentials = decrypt(vault, this.passphrase);

          // Execute checkout
          const result = await this.executor.execute(tx, credentials);

          // Mark completed and deduct balance
          const receipt: Receipt = {
            id: `rcpt_${txId.replace('tx_', '')}`,
            merchant: tx.merchant,
            amount: tx.amount,
            confirmationId: result.confirmationId ?? 'UNKNOWN',
            completedAt: new Date().toISOString(),
          };

          this.txManager.markCompleted(txId, receipt);
          this.budgetManager.deductBalance(tx.amount);
          this.auditLogger.log('COMPLETE', { txId, confirmationId: receipt.confirmationId });

          return receipt;
        } catch (err) {
          this.txManager.markFailed(txId, err instanceof Error ? err.message : 'Unknown error');
          this.auditLogger.log('FAILED', { txId, error: err instanceof Error ? err.message : 'Unknown' });
          throw err;
        }
      },
      getReceipt: (txId: string): Receipt | undefined => {
        const tx = this.txManager.get(txId);
        return tx?.receipt;
      },
    };
  }

  status(): {
    balance: number;
    budget: number;
    limitPerTx: number;
    pending: Transaction[];
    recent: Transaction[];
    isSetup: boolean;
  } {
    try {
      const wallet = this.budgetManager.getBalance();
      const pending = this.txManager.getPending();
      const recent = this.txManager.list().slice(-5);
      return {
        balance: wallet.balance,
        budget: wallet.budget,
        limitPerTx: wallet.limitPerTx,
        pending,
        recent,
        isSetup: true,
      };
    } catch {
      return {
        balance: 0,
        budget: 0,
        limitPerTx: 0,
        pending: [],
        recent: [],
        isSetup: false,
      };
    }
  }
}
