import {
  NotSetupError,
  DecryptError,
  InsufficientBalanceError,
  ExceedsTxLimitError,
  NotApprovedError,
  InvalidMandateError,
  AlreadyExecutedError,
  CheckoutFailedError,
  TimeoutError,
} from '@useagentpay/sdk';

export interface ToolResult {
  success: boolean;
  error?: string;
  nextAction?: string;
  [key: string]: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ERROR_MAP: Array<{
  type: new (...args: any[]) => Error;
  error: string;
  nextAction: string;
}> = [
  { type: NotSetupError, error: 'NOT_SETUP', nextAction: 'STOP - Human must run: agentpay setup' },
  { type: InsufficientBalanceError, error: 'INSUFFICIENT_BALANCE', nextAction: 'STOP - Human must add budget' },
  { type: ExceedsTxLimitError, error: 'EXCEEDS_TX_LIMIT', nextAction: 'STOP - Human must increase limit' },
  { type: NotApprovedError, error: 'NOT_APPROVED', nextAction: 'WAIT - Needs approval first' },
  { type: InvalidMandateError, error: 'INVALID_MANDATE', nextAction: 'STOP - Security error' },
  { type: AlreadyExecutedError, error: 'ALREADY_EXECUTED', nextAction: 'STOP - Already processed' },
  { type: CheckoutFailedError, error: 'CHECKOUT_FAILED', nextAction: 'ERROR - Human should review' },
  { type: TimeoutError, error: 'TIMEOUT', nextAction: 'RETRY - Try again later' },
  { type: DecryptError, error: 'DECRYPT_FAILED', nextAction: 'STOP - Wrong passphrase' },
];

export function mapError(err: unknown): ToolResult {
  if (err instanceof Error) {
    for (const mapping of ERROR_MAP) {
      if (err instanceof mapping.type) {
        return {
          success: false,
          error: mapping.error,
          message: err.message,
          nextAction: mapping.nextAction,
        };
      }
    }
  }

  return {
    success: false,
    error: 'UNKNOWN_ERROR',
    message: err instanceof Error ? err.message : String(err),
  };
}
