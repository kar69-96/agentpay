import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdtempSync, mkdirSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { getHomePath, getCredentialsPath, getWalletPath } from './paths.js';

describe('paths', () => {
  const originalEnv = process.env.AGENTPAY_HOME;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (originalEnv === undefined) {
      delete process.env.AGENTPAY_HOME;
    } else {
      process.env.AGENTPAY_HOME = originalEnv;
    }
  });

  it('returns ~/.agentpay by default', () => {
    delete process.env.AGENTPAY_HOME;
    const tempDir = mkdtempSync(join(tmpdir(), 'agentpay-paths-test-'));
    process.chdir(tempDir);
    try {
      expect(getHomePath()).toBe(join(homedir(), '.agentpay'));
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('respects AGENTPAY_HOME env var', () => {
    process.env.AGENTPAY_HOME = '/tmp/test-agentpay';
    expect(getHomePath()).toBe('/tmp/test-agentpay');
  });

  it('AGENTPAY_HOME takes priority over local ./agentpay/', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'agentpay-paths-test-'));
    mkdirSync(join(tempDir, 'agentpay'));
    process.chdir(tempDir);
    process.env.AGENTPAY_HOME = '/tmp/override';
    try {
      expect(getHomePath()).toBe('/tmp/override');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('detects ./agentpay/ in cwd when it exists', () => {
    delete process.env.AGENTPAY_HOME;
    const tempDir = realpathSync(mkdtempSync(join(tmpdir(), 'agentpay-paths-test-')));
    mkdirSync(join(tempDir, 'agentpay'));
    process.chdir(tempDir);
    try {
      expect(getHomePath()).toBe(join(tempDir, 'agentpay'));
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('falls back to ~/.agentpay/ when no local dir exists', () => {
    delete process.env.AGENTPAY_HOME;
    const tempDir = mkdtempSync(join(tmpdir(), 'agentpay-paths-test-'));
    process.chdir(tempDir);
    try {
      expect(getHomePath()).toBe(join(homedir(), '.agentpay'));
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('credentials path is under home', () => {
    delete process.env.AGENTPAY_HOME;
    const tempDir = mkdtempSync(join(tmpdir(), 'agentpay-paths-test-'));
    process.chdir(tempDir);
    try {
      expect(getCredentialsPath()).toBe(join(homedir(), '.agentpay', 'credentials.enc'));
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('wallet path is under home', () => {
    delete process.env.AGENTPAY_HOME;
    const tempDir = mkdtempSync(join(tmpdir(), 'agentpay-paths-test-'));
    process.chdir(tempDir);
    try {
      expect(getWalletPath()).toBe(join(homedir(), '.agentpay', 'wallet.json'));
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
