import { describe, it, expect } from 'vitest';
import { mapError } from '../src/errors.js';
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

describe('mapError', () => {
  it('maps NotSetupError', () => {
    const result = mapError(new NotSetupError());
    expect(result.success).toBe(false);
    expect(result.error).toBe('NOT_SETUP');
    expect(result.nextAction).toContain('STOP');
  });

  it('maps InsufficientBalanceError', () => {
    const result = mapError(new InsufficientBalanceError(100, 50));
    expect(result.success).toBe(false);
    expect(result.error).toBe('INSUFFICIENT_BALANCE');
    expect(result.nextAction).toContain('STOP');
  });

  it('maps ExceedsTxLimitError', () => {
    const result = mapError(new ExceedsTxLimitError(100, 50));
    expect(result.success).toBe(false);
    expect(result.error).toBe('EXCEEDS_TX_LIMIT');
    expect(result.nextAction).toContain('STOP');
  });

  it('maps NotApprovedError', () => {
    const result = mapError(new NotApprovedError('tx_123'));
    expect(result.success).toBe(false);
    expect(result.error).toBe('NOT_APPROVED');
    expect(result.nextAction).toContain('WAIT');
  });

  it('maps InvalidMandateError', () => {
    const result = mapError(new InvalidMandateError());
    expect(result.success).toBe(false);
    expect(result.error).toBe('INVALID_MANDATE');
    expect(result.nextAction).toContain('STOP');
  });

  it('maps AlreadyExecutedError', () => {
    const result = mapError(new AlreadyExecutedError('tx_123'));
    expect(result.success).toBe(false);
    expect(result.error).toBe('ALREADY_EXECUTED');
    expect(result.nextAction).toContain('STOP');
  });

  it('maps CheckoutFailedError', () => {
    const result = mapError(new CheckoutFailedError());
    expect(result.success).toBe(false);
    expect(result.error).toBe('CHECKOUT_FAILED');
    expect(result.nextAction).toContain('ERROR');
  });

  it('maps TimeoutError', () => {
    const result = mapError(new TimeoutError());
    expect(result.success).toBe(false);
    expect(result.error).toBe('TIMEOUT');
    expect(result.nextAction).toContain('RETRY');
  });

  it('maps DecryptError', () => {
    const result = mapError(new DecryptError());
    expect(result.success).toBe(false);
    expect(result.error).toBe('DECRYPT_FAILED');
    expect(result.nextAction).toContain('STOP');
  });

  it('maps unknown errors', () => {
    const result = mapError(new Error('something unexpected'));
    expect(result.success).toBe(false);
    expect(result.error).toBe('UNKNOWN_ERROR');
    expect(result.message).toBe('something unexpected');
  });

  it('maps non-Error values', () => {
    const result = mapError('string error');
    expect(result.success).toBe(false);
    expect(result.error).toBe('UNKNOWN_ERROR');
    expect(result.message).toBe('string error');
  });
});
