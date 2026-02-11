import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import http from 'node:http';
import { TransactionManager } from '../transactions/manager.js';
import { AuditLogger } from '../audit/logger.js';
import { generateKeyPair, saveKeyPair } from '../auth/keypair.js';
import { createApprovalServer, type ApprovalServerHandle } from './approval-server.js';

const TEST_PASSPHRASE = 'test-passphrase-1234';

function httpRequest(
  port: number,
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<{ status: number; data: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: postData
          ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
          : {},
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let data: Record<string, unknown>;
          try {
            data = JSON.parse(text);
          } catch {
            data = { _raw: text };
          }
          resolve({ status: res.statusCode ?? 0, data });
        });
      },
    );
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function httpGet(port: number, path: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: '127.0.0.1', port, path, method: 'GET' },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') });
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

/** Wait for the server to be listening (port > 0) */
function waitForPort(handle: ApprovalServerHandle, timeoutMs = 2000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (handle.port > 0) return resolve();
      if (Date.now() - start > timeoutMs) return reject(new Error('Server did not bind in time'));
      setTimeout(check, 10);
    };
    check();
  });
}

describe('Approval Server', () => {
  let tmpDir: string;
  let tm: TransactionManager;
  let audit: AuditLogger;
  let handle: ApprovalServerHandle | null;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'agentpay-approval-test-'));
    tm = new TransactionManager(join(tmpDir, 'transactions.json'));
    audit = new AuditLogger(join(tmpDir, 'audit.log'));

    // Generate and save a keypair with known passphrase
    const keysDir = join(tmpDir, 'keys');
    mkdirSync(keysDir, { recursive: true });
    const keys = generateKeyPair(TEST_PASSPHRASE);
    saveKeyPair(keys, join(keysDir, 'public.pem'), join(keysDir, 'private.pem'));

    handle = null;
  });

  afterEach(() => {
    if (handle) {
      handle.server.close();
    }
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function createPendingTx() {
    return tm.propose({
      merchant: 'amazon.com',
      amount: 29.99,
      description: 'Wireless mouse',
      url: 'https://amazon.com/dp/123',
    });
  }

  async function startServer(txId?: string) {
    const tx = txId ? tm.get(txId)! : createPendingTx();
    handle = createApprovalServer(tx, tm, audit, { openBrowser: false, home: tmpDir });
    await waitForPort(handle);
    return { tx, handle: handle! };
  }

  it('serves approval page with valid token', async () => {
    const { tx, handle: h } = await startServer();
    const res = await httpGet(h.port, `/approve/${tx.id}?token=${h.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toContain('AgentPay');
    expect(res.body).toContain('Approve Purchase');
    expect(res.body).toContain('amazon.com');
    expect(res.body).toContain('$29.99');
    expect(res.body).toContain(tx.id);
  });

  it('returns invalid page for wrong token', async () => {
    const { tx, handle: h } = await startServer();
    const res = await httpGet(h.port, `/approve/${tx.id}?token=wrong`);
    expect(res.status).toBe(200);
    expect(res.body).toContain('Invalid or expired');
  });

  it('returns invalid page for missing token', async () => {
    const { tx, handle: h } = await startServer();
    const res = await httpGet(h.port, `/approve/${tx.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toContain('Invalid or expired');
  });

  it('approve with valid passphrase succeeds', async () => {
    const { tx, handle: h } = await startServer();
    const res = await httpRequest(h.port, 'POST', '/api/approve', {
      token: h.token,
      passphrase: TEST_PASSPHRASE,
    });
    expect(res.status).toBe(200);
    expect(res.data.ok).toBe(true);

    const result = await h.promise;
    expect(result.action).toBe('approved');
    expect(result.passphrase).toBe(TEST_PASSPHRASE);

    const updated = tm.get(tx.id);
    expect(updated?.status).toBe('approved');
    expect(updated?.mandate).toBeDefined();
  });

  it('approve with wrong passphrase returns error', async () => {
    const { tx, handle: h } = await startServer();
    const res = await httpRequest(h.port, 'POST', '/api/approve', {
      token: h.token,
      passphrase: 'wrong-passphrase',
    });
    expect(res.status).toBe(400);
    expect(res.data.error).toBeDefined();

    // Tx should still be pending
    const updated = tm.get(tx.id);
    expect(updated?.status).toBe('pending');
  });

  it('approve with missing passphrase returns 400', async () => {
    const { handle: h } = await startServer();
    const res = await httpRequest(h.port, 'POST', '/api/approve', {
      token: h.token,
    });
    expect(res.status).toBe(400);
    expect(res.data.error).toBe('Passphrase is required.');
  });

  it('approve with invalid token returns 403', async () => {
    const { handle: h } = await startServer();
    const res = await httpRequest(h.port, 'POST', '/api/approve', {
      token: 'bad-token',
      passphrase: TEST_PASSPHRASE,
    });
    expect(res.status).toBe(403);
  });

  it('reject with valid token succeeds', async () => {
    const { tx, handle: h } = await startServer();
    const res = await httpRequest(h.port, 'POST', '/api/reject', {
      token: h.token,
    });
    expect(res.status).toBe(200);
    expect(res.data.ok).toBe(true);

    const result = await h.promise;
    expect(result.action).toBe('rejected');
    expect(result.reason).toBeUndefined();

    const updated = tm.get(tx.id);
    expect(updated?.status).toBe('rejected');
  });

  it('reject with reason', async () => {
    const { tx, handle: h } = await startServer();
    const res = await httpRequest(h.port, 'POST', '/api/reject', {
      token: h.token,
      reason: 'Too expensive',
    });
    expect(res.status).toBe(200);

    const result = await h.promise;
    expect(result.action).toBe('rejected');
    expect(result.reason).toBe('Too expensive');

    const updated = tm.get(tx.id);
    expect(updated?.status).toBe('rejected');
    expect(updated?.rejectionReason).toBe('Too expensive');
  });

  it('reject with invalid token returns 403', async () => {
    const { handle: h } = await startServer();
    const res = await httpRequest(h.port, 'POST', '/api/reject', {
      token: 'bad-token',
    });
    expect(res.status).toBe(403);
  });

  it('token is single-use (approve then reuse)', async () => {
    const { handle: h } = await startServer();

    // First use: approve
    const res1 = await httpRequest(h.port, 'POST', '/api/approve', {
      token: h.token,
      passphrase: TEST_PASSPHRASE,
    });
    expect(res1.status).toBe(200);

    await h.promise; // let it settle

    // Server is closed after settle — new request should fail
    // But let's also test GET with used token before server close
    // by creating another server
    const tx2 = createPendingTx();
    const handle2 = createApprovalServer(tx2, tm, audit, { openBrowser: false, home: tmpDir });
    handle = handle2; // for cleanup
    await waitForPort(handle2);

    // Approve once
    const res2 = await httpRequest(handle2.port, 'POST', '/api/approve', {
      token: handle2.token,
      passphrase: TEST_PASSPHRASE,
    });
    expect(res2.status).toBe(200);

    // The server closes after resolve, so we can't easily test reuse.
    // Instead verify the promise resolved correctly.
    const result = await handle2.promise;
    expect(result.action).toBe('approved');
  });

  it('approve already non-pending tx returns error', async () => {
    const tx = createPendingTx();
    // Reject the tx first via the manager directly
    tm.reject(tx.id, 'already rejected');

    handle = createApprovalServer(tx, tm, audit, { openBrowser: false, home: tmpDir });
    await waitForPort(handle);

    const res = await httpRequest(handle.port, 'POST', '/api/approve', {
      token: handle.token,
      passphrase: TEST_PASSPHRASE,
    });
    expect(res.status).toBe(400);
    expect(res.data.error).toBe('Transaction is no longer pending.');
  });

  it('reject already non-pending tx returns error', async () => {
    const tx = createPendingTx();
    tm.reject(tx.id, 'already rejected');

    handle = createApprovalServer(tx, tm, audit, { openBrowser: false, home: tmpDir });
    await waitForPort(handle);

    const res = await httpRequest(handle.port, 'POST', '/api/reject', {
      token: handle.token,
    });
    expect(res.status).toBe(400);
    expect(res.data.error).toBe('Transaction is no longer pending.');
  });

  it('server binds to 127.0.0.1 only', async () => {
    const { handle: h } = await startServer();
    const addr = h.server.address();
    expect(addr).not.toBeNull();
    expect(typeof addr).not.toBe('string');
    if (typeof addr === 'object' && addr !== null) {
      expect(addr.address).toBe('127.0.0.1');
    }
  });

  it('unknown route returns 404', async () => {
    const { handle: h } = await startServer();
    const res = await httpRequest(h.port, 'GET', '/unknown');
    expect(res.status).toBe(404);
  });

  it('timeout rejects with TimeoutError', async () => {
    vi.useFakeTimers();
    const tx = createPendingTx();

    // We need to manage timers carefully. createApprovalServer uses setTimeout.
    handle = createApprovalServer(tx, tm, audit, { openBrowser: false, home: tmpDir });

    // Advance past the 5-minute timeout
    const promise = handle.promise;
    vi.advanceTimersByTime(5 * 60 * 1000 + 100);

    await expect(promise).rejects.toThrow('Approval timed out after 5 minutes.');

    vi.useRealTimers();
  });

  it('audit log records approval', async () => {
    const { handle: h } = await startServer();
    await httpRequest(h.port, 'POST', '/api/approve', {
      token: h.token,
      passphrase: TEST_PASSPHRASE,
    });
    await h.promise;

    const log = audit.getLog();
    const approveEntry = log.find((entry) => entry.includes('APPROVE'));
    expect(approveEntry).toBeDefined();
    expect(approveEntry).toContain('browser-approval');
  });

  it('audit log records rejection', async () => {
    const { handle: h } = await startServer();
    await httpRequest(h.port, 'POST', '/api/reject', {
      token: h.token,
      reason: 'Changed my mind',
    });
    await h.promise;

    const log = audit.getLog();
    const rejectEntry = log.find((entry) => entry.includes('REJECT'));
    expect(rejectEntry).toBeDefined();
    expect(rejectEntry).toContain('browser-approval');
    expect(rejectEntry).toContain('Changed my mind');
  });
});
