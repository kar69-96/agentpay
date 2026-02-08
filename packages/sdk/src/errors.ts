export class NotSetupError extends Error {
  readonly code = 'NOT_SETUP';
  constructor(message = 'AgentPay has not been set up yet. Run `agentpay setup` first.') {
    super(message);
    this.name = 'NotSetupError';
  }
}

export class DecryptError extends Error {
  readonly code = 'DECRYPT_FAILED';
  constructor(message = 'Failed to decrypt credentials. Wrong passphrase or corrupted file.') {
    super(message);
    this.name = 'DecryptError';
  }
}

export class InsufficientBalanceError extends Error {
  readonly code = 'INSUFFICIENT_BALANCE';
  constructor(amount?: number, balance?: number) {
    const msg = amount !== undefined && balance !== undefined
      ? `Insufficient balance: requested $${amount.toFixed(2)} but only $${balance.toFixed(2)} available.`
      : 'Insufficient balance for this transaction.';
    super(msg);
    this.name = 'InsufficientBalanceError';
  }
}

export class ExceedsTxLimitError extends Error {
  readonly code = 'EXCEEDS_TX_LIMIT';
  constructor(amount?: number, limit?: number) {
    const msg = amount !== undefined && limit !== undefined
      ? `Amount $${amount.toFixed(2)} exceeds per-transaction limit of $${limit.toFixed(2)}.`
      : 'Amount exceeds per-transaction limit.';
    super(msg);
    this.name = 'ExceedsTxLimitError';
  }
}

export class NotApprovedError extends Error {
  readonly code = 'NOT_APPROVED';
  constructor(txId?: string) {
    super(txId ? `Transaction ${txId} has not been approved.` : 'Transaction has not been approved.');
    this.name = 'NotApprovedError';
  }
}

export class InvalidMandateError extends Error {
  readonly code = 'INVALID_MANDATE';
  constructor(message = 'Purchase mandate signature verification failed.') {
    super(message);
    this.name = 'InvalidMandateError';
  }
}

export class AlreadyExecutedError extends Error {
  readonly code = 'ALREADY_EXECUTED';
  constructor(txId?: string) {
    super(txId ? `Transaction ${txId} has already been executed.` : 'Transaction has already been executed.');
    this.name = 'AlreadyExecutedError';
  }
}

export class CheckoutFailedError extends Error {
  readonly code = 'CHECKOUT_FAILED';
  constructor(message = 'Failed to complete checkout.') {
    super(message);
    this.name = 'CheckoutFailedError';
  }
}

export class TimeoutError extends Error {
  readonly code = 'TIMEOUT';
  constructor(message = 'Operation timed out.') {
    super(message);
    this.name = 'TimeoutError';
  }
}
