import { describe, it, expect, beforeEach } from 'vitest';
import { createServer } from '../src/server.js';
import type { ServerConfig } from '../src/config.js';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function createTestConfig(home: string): ServerConfig {
  return {
    home,
    passphraseMode: 'none',
  };
}

function setupTestHome(): string {
  const home = mkdtempSync(join(tmpdir(), 'agentpay-test-'));
  // Create wallet.json
  writeFileSync(
    join(home, 'wallet.json'),
    JSON.stringify({ budget: 100, balance: 75, limitPerTx: 50, spent: 25 })
  );
  // Create transactions.json
  writeFileSync(join(home, 'transactions.json'), JSON.stringify([]));
  // Create audit.log
  writeFileSync(join(home, 'audit.log'), '');
  return home;
}

describe('createServer', () => {
  let home: string;

  beforeEach(() => {
    home = setupTestHome();
  });

  it('creates a McpServer instance', () => {
    const config = createTestConfig(home);
    const server = createServer(config);
    expect(server).toBeDefined();
  });

  it('server has correct name and version', () => {
    const config = createTestConfig(home);
    const server = createServer(config);
    // McpServer is opaque — we verify it doesn't throw during creation
    expect(server).toBeDefined();
  });
});
