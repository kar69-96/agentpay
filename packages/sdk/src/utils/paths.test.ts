import { describe, it, expect, afterEach } from 'vitest';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { getHomePath, getCredentialsPath, getWalletPath } from './paths.js';

describe('paths', () => {
  const originalEnv = process.env.AGENTPAY_HOME;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.AGENTPAY_HOME;
    } else {
      process.env.AGENTPAY_HOME = originalEnv;
    }
  });

  it('returns ~/.agentpay by default', () => {
    delete process.env.AGENTPAY_HOME;
    expect(getHomePath()).toBe(join(homedir(), '.agentpay'));
  });

  it('respects AGENTPAY_HOME env var', () => {
    process.env.AGENTPAY_HOME = '/tmp/test-agentpay';
    expect(getHomePath()).toBe('/tmp/test-agentpay');
  });

  it('credentials path is under home', () => {
    delete process.env.AGENTPAY_HOME;
    expect(getCredentialsPath()).toBe(join(homedir(), '.agentpay', 'credentials.enc'));
  });

  it('wallet path is under home', () => {
    delete process.env.AGENTPAY_HOME;
    expect(getWalletPath()).toBe(join(homedir(), '.agentpay', 'wallet.json'));
  });
});
