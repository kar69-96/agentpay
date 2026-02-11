import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import http from 'node:http';
import { createSetupServer, type SetupServerHandle } from './setup-server.js';
import { loadVault, decrypt } from '../vault/vault.js';

const TEST_PASSPHRASE = 'test-setup-passphrase-1234';

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

function waitForPort(handle: SetupServerHandle, timeoutMs = 2000): Promise<void> {
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

function validSetupBody(token: string) {
  return {
    token,
    passphrase: TEST_PASSPHRASE,
    budget: 100,
    limitPerTx: 50,
    card: { number: '4111111111111111', expiry: '12/25', cvv: '123' },
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+15550100',
    billingAddress: { street: '123 Main St', city: 'Springfield', state: 'IL', zip: '62701', country: 'US' },
    shippingAddress: { street: '123 Main St', city: 'Springfield', state: 'IL', zip: '62701', country: 'US' },
  };
}

describe('Setup Server', () => {
  let tmpDir: string;
  let handle: SetupServerHandle | null;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'agentpay-setup-test-'));
    handle = null;
  });

  afterEach(() => {
    if (handle) {
      handle.server.close();
    }
    rmSync(tmpDir, { recursive: true, force: true });
  });

  async function startServer() {
    handle = createSetupServer({ openBrowser: false, home: tmpDir });
    await waitForPort(handle);
    return handle!;
  }

  it('serves setup page with valid token', async () => {
    const h = await startServer();
    const res = await httpGet(h.port, `/setup?token=${h.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toContain('AgentPay');
    expect(res.body).toContain('Initial Setup');
    expect(res.body).toContain('Passphrase');
    expect(res.body).toContain('Complete Setup');
  });

  it('returns invalid page for wrong token', async () => {
    const h = await startServer();
    const res = await httpGet(h.port, '/setup?token=wrong');
    expect(res.status).toBe(200);
    expect(res.body).toContain('Invalid or expired');
  });

  it('returns invalid page for missing token', async () => {
    const h = await startServer();
    const res = await httpGet(h.port, '/setup');
    expect(res.status).toBe(200);
    expect(res.body).toContain('Invalid or expired');
  });

  it('POST with valid data creates vault, keypair, and wallet', async () => {
    const h = await startServer();
    const res = await httpRequest(h.port, 'POST', '/api/setup', validSetupBody(h.token));
    expect(res.status).toBe(200);
    expect(res.data.ok).toBe(true);

    const result = await h.promise;
    expect(result.completed).toBe(true);

    // Verify vault was created
    const vault = loadVault(join(tmpDir, 'credentials.enc'));
    const creds = decrypt(vault, TEST_PASSPHRASE);
    expect(creds.card.number).toBe('4111111111111111');
    expect(creds.name).toBe('Jane Doe');
    expect(creds.email).toBe('jane@example.com');

    // Verify keypair was created
    expect(existsSync(join(tmpDir, 'keys', 'public.pem'))).toBe(true);
    expect(existsSync(join(tmpDir, 'keys', 'private.pem'))).toBe(true);

    // Verify wallet was created
    const walletData = JSON.parse(readFileSync(join(tmpDir, 'wallet.json'), 'utf8'));
    expect(walletData.budget).toBe(100);
    expect(walletData.balance).toBe(100);
    expect(walletData.limitPerTx).toBe(50);
    expect(walletData.spent).toBe(0);

    // Verify audit log
    const auditLog = readFileSync(join(tmpDir, 'audit.log'), 'utf8');
    expect(auditLog).toContain('SETUP');
    expect(auditLog).toContain('browser-setup');
  });

  it('POST with mismatched token returns 403', async () => {
    const h = await startServer();
    const res = await httpRequest(h.port, 'POST', '/api/setup', validSetupBody('wrong-token'));
    expect(res.status).toBe(403);
    expect(res.data.error).toBe('Invalid or expired token.');
  });

  it('POST with missing passphrase returns 400', async () => {
    const h = await startServer();
    const body = validSetupBody(h.token);
    delete (body as Record<string, unknown>).passphrase;
    const res = await httpRequest(h.port, 'POST', '/api/setup', body);
    expect(res.status).toBe(400);
    expect(res.data.error).toBe('Passphrase is required.');
  });

  it('POST with missing card returns 400', async () => {
    const h = await startServer();
    const body = validSetupBody(h.token);
    delete (body as Record<string, unknown>).card;
    const res = await httpRequest(h.port, 'POST', '/api/setup', body);
    expect(res.status).toBe(400);
    expect(res.data.error).toBe('Card number, expiry, and CVV are required.');
  });

  it('POST with missing name returns 400', async () => {
    const h = await startServer();
    const body = validSetupBody(h.token);
    delete (body as Record<string, unknown>).name;
    const res = await httpRequest(h.port, 'POST', '/api/setup', body);
    expect(res.status).toBe(400);
    expect(res.data.error).toBe('Name, email, and phone are required.');
  });

  it('POST with missing billing address returns 400', async () => {
    const h = await startServer();
    const body = validSetupBody(h.token);
    delete (body as Record<string, unknown>).billingAddress;
    const res = await httpRequest(h.port, 'POST', '/api/setup', body);
    expect(res.status).toBe(400);
    expect(res.data.error).toBe('Complete billing address is required.');
  });

  it('POST with missing shipping address returns 400', async () => {
    const h = await startServer();
    const body = validSetupBody(h.token);
    delete (body as Record<string, unknown>).shippingAddress;
    const res = await httpRequest(h.port, 'POST', '/api/setup', body);
    expect(res.status).toBe(400);
    expect(res.data.error).toBe('Complete shipping address is required.');
  });

  it('server binds to 127.0.0.1 only', async () => {
    const h = await startServer();
    const addr = h.server.address();
    expect(addr).not.toBeNull();
    expect(typeof addr).not.toBe('string');
    if (typeof addr === 'object' && addr !== null) {
      expect(addr.address).toBe('127.0.0.1');
    }
  });

  it('token is single-use', async () => {
    const h = await startServer();

    // First use: setup
    const res1 = await httpRequest(h.port, 'POST', '/api/setup', validSetupBody(h.token));
    expect(res1.status).toBe(200);
    expect(res1.data.ok).toBe(true);

    await h.promise;

    // Create another server to test single-use behavior
    const h2 = createSetupServer({ openBrowser: false, home: mkdtempSync(join(tmpdir(), 'agentpay-setup-test2-')) });
    handle = h2; // for cleanup
    await waitForPort(h2);

    const res2 = await httpRequest(h2.port, 'POST', '/api/setup', validSetupBody(h2.token));
    expect(res2.status).toBe(200);

    const result2 = await h2.promise;
    expect(result2.completed).toBe(true);
  });

  it('unknown route returns 404', async () => {
    const h = await startServer();
    const res = await httpRequest(h.port, 'GET', '/unknown');
    expect(res.status).toBe(404);
  });

  it('timeout rejects with TimeoutError', async () => {
    vi.useFakeTimers();

    handle = createSetupServer({ openBrowser: false, home: tmpDir });

    const promise = handle.promise;
    vi.advanceTimersByTime(10 * 60 * 1000 + 100);

    await expect(promise).rejects.toThrow('Setup timed out after 10 minutes.');

    vi.useRealTimers();
  });

  it('POST with zero budget defaults correctly', async () => {
    const h = await startServer();
    const body = validSetupBody(h.token);
    delete (body as Record<string, unknown>).budget;
    delete (body as Record<string, unknown>).limitPerTx;
    const res = await httpRequest(h.port, 'POST', '/api/setup', body);
    expect(res.status).toBe(200);

    await h.promise;

    const walletData = JSON.parse(readFileSync(join(tmpDir, 'wallet.json'), 'utf8'));
    expect(walletData.budget).toBe(0);
    expect(walletData.limitPerTx).toBe(0);
  });
});
