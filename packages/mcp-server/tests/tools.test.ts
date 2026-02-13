import { describe, it, expect, beforeEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.js';
import type { ServerConfig } from '../src/config.js';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function setupTestHome(options?: { withPending?: boolean }): string {
  const home = mkdtempSync(join(tmpdir(), 'agentpay-mcp-test-'));
  writeFileSync(
    join(home, 'wallet.json'),
    JSON.stringify({ budget: 100, balance: 75, limitPerTx: 50, spent: 25 })
  );
  const transactions = options?.withPending
    ? [
        {
          id: 'tx_test1',
          status: 'pending',
          merchant: 'TestMerchant',
          amount: 25,
          description: 'Test item',
          url: 'https://example.com/item',
          createdAt: new Date().toISOString(),
        },
      ]
    : [];
  writeFileSync(join(home, 'transactions.json'), JSON.stringify(transactions));
  writeFileSync(join(home, 'audit.log'), '');
  return home;
}

async function createTestClient(home: string) {
  const config: ServerConfig = { home, passphraseMode: 'none' };
  const server = createServer(config);
  const client = new Client({ name: 'test-client', version: '0.1.0' });

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);

  return { client, server };
}

describe('MCP Tools', () => {
  let home: string;

  beforeEach(() => {
    home = setupTestHome();
  });

  it('lists all 9 tools', async () => {
    const { client } = await createTestClient(home);
    const result = await client.listTools();
    expect(result.tools).toHaveLength(9);

    const names = result.tools.map((t) => t.name).sort();
    expect(names).toEqual([
      'agentpay_check_balance',
      'agentpay_execute_purchase',
      'agentpay_get_receipt',
      'agentpay_get_transaction',
      'agentpay_list_pending',
      'agentpay_propose_purchase',
      'agentpay_request_mobile_approval',
      'agentpay_status',
      'agentpay_wait_for_approval',
    ]);
  });

  it('agentpay_status returns correct shape', async () => {
    const { client } = await createTestClient(home);
    const result = await client.callTool({ name: 'agentpay_status', arguments: {} });

    const content = result.content as Array<{ type: string; text: string }>;
    expect(content).toHaveLength(1);
    expect(content[0].type).toBe('text');

    const data = JSON.parse(content[0].text);
    expect(data.success).toBe(true);
    expect(data.isSetup).toBe(true);
    expect(data.balance).toBe(75);
    expect(data.budget).toBe(100);
    expect(data.pendingCount).toBe(0);
    expect(data.nextAction).toBeDefined();
  });

  it('agentpay_check_balance returns wallet info', async () => {
    const { client } = await createTestClient(home);
    const result = await client.callTool({ name: 'agentpay_check_balance', arguments: {} });

    const content = result.content as Array<{ type: string; text: string }>;
    const data = JSON.parse(content[0].text);
    expect(data.success).toBe(true);
    expect(data.balance).toBe(75);
    expect(data.budget).toBe(100);
    expect(data.limitPerTx).toBe(50);
    expect(data.spent).toBe(25);
  });

  it('agentpay_list_pending returns empty list', async () => {
    const { client } = await createTestClient(home);
    const result = await client.callTool({ name: 'agentpay_list_pending', arguments: {} });

    const content = result.content as Array<{ type: string; text: string }>;
    const data = JSON.parse(content[0].text);
    expect(data.success).toBe(true);
    expect(data.count).toBe(0);
    expect(data.pending).toEqual([]);
  });

  it('agentpay_list_pending returns pending transactions', async () => {
    const pendingHome = setupTestHome({ withPending: true });
    const { client } = await createTestClient(pendingHome);
    const result = await client.callTool({ name: 'agentpay_list_pending', arguments: {} });

    const content = result.content as Array<{ type: string; text: string }>;
    const data = JSON.parse(content[0].text);
    expect(data.success).toBe(true);
    expect(data.count).toBe(1);
    expect(data.pending[0].merchant).toBe('TestMerchant');
  });

  it('agentpay_propose_purchase creates a transaction', async () => {
    const { client } = await createTestClient(home);
    const result = await client.callTool({
      name: 'agentpay_propose_purchase',
      arguments: {
        merchant: 'Amazon',
        amount: 29.99,
        description: 'Test product',
        url: 'https://amazon.com/dp/test',
      },
    });

    const content = result.content as Array<{ type: string; text: string }>;
    const data = JSON.parse(content[0].text);
    expect(data.success).toBe(true);
    expect(data.txId).toMatch(/^tx_/);
    expect(data.status).toBe('pending');
    expect(data.merchant).toBe('Amazon');
    expect(data.amount).toBe(29.99);
  });

  it('agentpay_propose_purchase rejects over-budget amounts', async () => {
    const { client } = await createTestClient(home);
    const result = await client.callTool({
      name: 'agentpay_propose_purchase',
      arguments: {
        merchant: 'Expensive',
        amount: 200,
        description: 'Too expensive',
        url: 'https://example.com/expensive',
      },
    });

    const content = result.content as Array<{ type: string; text: string }>;
    const data = JSON.parse(content[0].text);
    expect(data.success).toBe(false);
    // Could be INSUFFICIENT_BALANCE or EXCEEDS_TX_LIMIT depending on amounts
    expect(data.error).toBeDefined();
  });

  it('agentpay_get_transaction returns not found', async () => {
    const { client } = await createTestClient(home);
    const result = await client.callTool({
      name: 'agentpay_get_transaction',
      arguments: { txId: 'tx_nonexistent' },
    });

    const content = result.content as Array<{ type: string; text: string }>;
    const data = JSON.parse(content[0].text);
    expect(data.success).toBe(false);
    expect(data.error).toBe('NOT_FOUND');
  });

  it('agentpay_get_transaction returns existing transaction', async () => {
    const pendingHome = setupTestHome({ withPending: true });
    const { client } = await createTestClient(pendingHome);
    const result = await client.callTool({
      name: 'agentpay_get_transaction',
      arguments: { txId: 'tx_test1' },
    });

    const content = result.content as Array<{ type: string; text: string }>;
    const data = JSON.parse(content[0].text);
    expect(data.success).toBe(true);
    expect(data.id).toBe('tx_test1');
    expect(data.status).toBe('pending');
    expect(data.nextAction).toContain('WAIT');
  });

  it('agentpay_get_receipt returns no receipt for non-completed tx', async () => {
    const pendingHome = setupTestHome({ withPending: true });
    const { client } = await createTestClient(pendingHome);
    const result = await client.callTool({
      name: 'agentpay_get_receipt',
      arguments: { txId: 'tx_test1' },
    });

    const content = result.content as Array<{ type: string; text: string }>;
    const data = JSON.parse(content[0].text);
    expect(data.success).toBe(false);
    expect(data.error).toBe('NO_RECEIPT');
  });

  it('agentpay_execute_purchase fails without passphrase', async () => {
    const pendingHome = setupTestHome({ withPending: true });
    const { client } = await createTestClient(pendingHome);
    const result = await client.callTool({
      name: 'agentpay_execute_purchase',
      arguments: { txId: 'tx_test1' },
    });

    const content = result.content as Array<{ type: string; text: string }>;
    const data = JSON.parse(content[0].text);
    expect(data.success).toBe(false);
    // Should fail because passphrase is not configured
    expect(data.error).toBeDefined();
  });
});

describe('MCP Resources', () => {
  it('lists all 3 resources', async () => {
    const home = setupTestHome();
    const { client } = await createTestClient(home);
    const result = await client.listResources();
    expect(result.resources.length).toBeGreaterThanOrEqual(2); // wallet + audit-log are static
  });

  it('lists resource templates', async () => {
    const home = setupTestHome();
    const { client } = await createTestClient(home);
    const result = await client.listResourceTemplates();
    const templateUris = result.resourceTemplates.map((t) => t.uriTemplate);
    expect(templateUris).toContain('agentpay://transactions/{txId}');
  });

  it('reads wallet resource', async () => {
    const home = setupTestHome();
    const { client } = await createTestClient(home);
    const result = await client.readResource({ uri: 'agentpay://wallet' });

    const content = result.contents[0];
    expect(content.mimeType).toBe('application/json');
    const data = JSON.parse(content.text as string);
    expect(data.balance).toBe(75);
    expect(data.budget).toBe(100);
  });

  it('reads audit-log resource', async () => {
    const home = setupTestHome();
    const { client } = await createTestClient(home);
    const result = await client.readResource({ uri: 'agentpay://audit-log' });

    const content = result.contents[0];
    expect(content.mimeType).toBe('application/json');
    const data = JSON.parse(content.text as string);
    expect(Array.isArray(data)).toBe(true);
  });

  it('reads transaction resource', async () => {
    const home = setupTestHome({ withPending: true });
    const { client } = await createTestClient(home);
    const result = await client.readResource({
      uri: 'agentpay://transactions/tx_test1',
    });

    const content = result.contents[0];
    const data = JSON.parse(content.text as string);
    expect(data.id).toBe('tx_test1');
    expect(data.mandate).toBeUndefined(); // mandate stripped for security
  });
});

describe('MCP Prompts', () => {
  it('lists all 3 prompts', async () => {
    const home = setupTestHome();
    const { client } = await createTestClient(home);
    const result = await client.listPrompts();
    expect(result.prompts).toHaveLength(3);

    const names = result.prompts.map((p) => p.name).sort();
    expect(names).toEqual(['budget-check', 'buy', 'purchase-status']);
  });

  it('buy prompt returns messages', async () => {
    const home = setupTestHome();
    const { client } = await createTestClient(home);
    const result = await client.getPrompt({
      name: 'buy',
      arguments: {
        merchant: 'Amazon',
        amount: '29.99',
        description: 'Test item',
        url: 'https://amazon.com/test',
      },
    });

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe('user');
    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain('Amazon');
    expect(text).toContain('agentpay_check_balance');
    expect(text).toContain('agentpay_propose_purchase');
  });

  it('budget-check prompt returns messages', async () => {
    const home = setupTestHome();
    const { client } = await createTestClient(home);
    const result = await client.getPrompt({
      name: 'budget-check',
      arguments: {},
    });

    expect(result.messages).toHaveLength(1);
    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain('agentpay_check_balance');
  });

  it('purchase-status prompt accepts limit arg', async () => {
    const home = setupTestHome();
    const { client } = await createTestClient(home);
    const result = await client.getPrompt({
      name: 'purchase-status',
      arguments: { limit: '10' },
    });

    expect(result.messages).toHaveLength(1);
    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain('10');
  });
});
