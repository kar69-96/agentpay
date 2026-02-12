declare const __PKG_VERSION__: string;
export const VERSION = typeof __PKG_VERSION__ !== 'undefined' ? __PKG_VERSION__ : '0.0.0';

// Types
export type { BillingCredentials, EncryptedVault } from './vault/types.js';
export type { KeyPair, PurchaseMandate, TransactionDetails } from './auth/types.js';
export type { Wallet } from './budget/types.js';
export type { Transaction, TransactionStatus, Receipt, ProposeOptions } from './transactions/types.js';
export type { CheckoutResult, ExecutorConfig } from './executor/types.js';
export type { BrowserProvider } from './executor/browser-provider.js';

// Errors
export {
  NotSetupError,
  DecryptError,
  InsufficientBalanceError,
  ExceedsTxLimitError,
  NotApprovedError,
  InvalidMandateError,
  AlreadyExecutedError,
  CheckoutFailedError,
  TimeoutError,
} from './errors.js';

// Utilities
export { generateTxId } from './utils/ids.js';
export { formatCurrency, formatTimestamp, formatTable, formatStatus } from './utils/display.js';
export { getHomePath, getCredentialsPath, getKeysPath, getWalletPath, getTransactionsPath, getAuditPath } from './utils/paths.js';

// Vault
export { encrypt, decrypt, saveVault, loadVault } from './vault/vault.js';

// Auth
export { generateKeyPair, saveKeyPair, loadPublicKey, loadPrivateKey } from './auth/keypair.js';
export { createMandate, verifyMandate } from './auth/mandate.js';

// Budget
export { BudgetManager } from './budget/budget.js';

// Transactions
export { TransactionManager } from './transactions/manager.js';
export { waitForApproval } from './transactions/poller.js';

// Audit
export { AuditLogger } from './audit/logger.js';

// Executor
export { PurchaseExecutor } from './executor/executor.js';
export { PLACEHOLDER_MAP, getPlaceholderVariables, credentialsToSwapMap } from './executor/placeholder.js';

// Approval Server
export type { ApprovalResult } from './server/approval-server.js';
export { requestBrowserApproval } from './server/approval-server.js';

// Setup Server
export type { SetupResult } from './server/setup-server.js';
export { requestBrowserSetup } from './server/setup-server.js';

// Dashboard Server
export { startServer as startDashboardServer } from './server/index.js';

// Browser & Prompt Utilities
export { openBrowser } from './utils/open-browser.js';
export { promptInput, promptPassphrase, promptConfirm, promptPassphraseSafe } from './utils/prompt.js';

// AgentPay
export { AgentPay } from './agentpay.js';
export type { AgentPayOptions } from './agentpay.js';
