import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { AuditLogger } from './logger.js';

describe('AuditLogger', () => {
  let tmpDir: string;
  let logger: AuditLogger;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'agentpay-audit-test-'));
    logger = new AuditLogger(join(tmpDir, 'audit.log'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('log creates audit file', () => {
    logger.log('SETUP', { message: 'credentials encrypted' });
    expect(existsSync(join(tmpDir, 'audit.log'))).toBe(true);
  });

  it('log entries have ISO timestamps', () => {
    logger.log('SETUP', { message: 'test' });
    const entries = logger.getLog();
    expect(entries.length).toBe(1);
    const [timestamp] = entries[0].split('\t');
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('multiple log entries are appended', () => {
    logger.log('SETUP', { message: 'init' });
    logger.log('PROPOSE', { txId: 'tx_abc', amount: 29.99 });
    logger.log('APPROVE', { txId: 'tx_abc' });
    const entries = logger.getLog();
    expect(entries.length).toBe(3);
    expect(entries[1]).toContain('PROPOSE');
  });

  it('getLog returns empty array when no file', () => {
    const empty = new AuditLogger(join(tmpDir, 'nonexistent.log'));
    expect(empty.getLog()).toEqual([]);
  });
});
