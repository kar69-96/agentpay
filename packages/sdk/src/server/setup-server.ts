import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http';
import { randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getSetupHtml } from './setup-html.js';
import { openBrowser } from '../utils/open-browser.js';
import { encrypt, saveVault } from '../vault/vault.js';
import { generateKeyPair, saveKeyPair } from '../auth/keypair.js';
import { BudgetManager } from '../budget/budget.js';
import { AuditLogger } from '../audit/logger.js';
import { getHomePath, getCredentialsPath, getKeysPath, getWalletPath, getAuditPath } from '../utils/paths.js';
import { TimeoutError } from '../errors.js';
import type { BillingCredentials } from '../vault/types.js';

const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const MAX_BODY = 8192; // setup form sends more data than approval

export interface SetupResult {
  completed: boolean;
}

function parseBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        req.destroy();
        reject(new Error('Request body too large'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve(text ? JSON.parse(text) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: Record<string, unknown>): void {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(json),
  });
  res.end(json);
}

function sendHtml(res: ServerResponse, html: string): void {
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(html),
  });
  res.end(html);
}

function isNonEmptyString(val: unknown): val is string {
  return typeof val === 'string' && val.length > 0;
}

function isAddress(val: unknown): val is { street: string; city: string; state: string; zip: string; country: string } {
  if (!val || typeof val !== 'object') return false;
  const a = val as Record<string, unknown>;
  return isNonEmptyString(a.street)
    && isNonEmptyString(a.city)
    && isNonEmptyString(a.state)
    && isNonEmptyString(a.zip)
    && isNonEmptyString(a.country);
}

function isCard(val: unknown): val is { number: string; expiry: string; cvv: string } {
  if (!val || typeof val !== 'object') return false;
  const c = val as Record<string, unknown>;
  return isNonEmptyString(c.number) && isNonEmptyString(c.expiry) && isNonEmptyString(c.cvv);
}

export interface SetupServerHandle {
  server: Server;
  token: string;
  port: number;
  promise: Promise<SetupResult>;
}

/**
 * Create the ephemeral setup server without opening a browser.
 * Useful for testing — call `requestBrowserSetup` for the full flow.
 */
export function createSetupServer(
  options?: { openBrowser?: boolean; home?: string },
): SetupServerHandle {
  const nonce = randomBytes(32).toString('hex');
  let settled = false;
  let tokenUsed = false;
  let resolvePromise: (result: SetupResult) => void;
  let rejectPromise: (err: Error) => void;
  let timer: ReturnType<typeof setTimeout>;
  let serverInstance: Server;

  const promise = new Promise<SetupResult>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  function cleanup(): void {
    clearTimeout(timer);
    serverInstance.close();
  }

  const home = options?.home ?? getHomePath();

  serverInstance = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    const method = req.method ?? 'GET';

    try {
      // GET /setup?token=X — serve setup page
      if (method === 'GET' && url.pathname === '/setup') {
        const token = url.searchParams.get('token');
        if (token !== nonce || tokenUsed) {
          sendHtml(res, '<h1>Invalid or expired link.</h1>');
          return;
        }
        sendHtml(res, getSetupHtml(nonce));
        return;
      }

      // POST /api/setup — process setup form
      if (method === 'POST' && url.pathname === '/api/setup') {
        const body = await parseBody(req);
        if (body.token !== nonce || tokenUsed) {
          sendJson(res, 403, { error: 'Invalid or expired token.' });
          return;
        }

        // Validate required fields
        const passphrase = body.passphrase;
        if (!isNonEmptyString(passphrase)) {
          sendJson(res, 400, { error: 'Passphrase is required.' });
          return;
        }

        if (!isCard(body.card)) {
          sendJson(res, 400, { error: 'Card number, expiry, and CVV are required.' });
          return;
        }

        if (!isNonEmptyString(body.name) || !isNonEmptyString(body.email) || !isNonEmptyString(body.phone)) {
          sendJson(res, 400, { error: 'Name, email, and phone are required.' });
          return;
        }

        if (!isAddress(body.billingAddress)) {
          sendJson(res, 400, { error: 'Complete billing address is required.' });
          return;
        }

        if (!isAddress(body.shippingAddress)) {
          sendJson(res, 400, { error: 'Complete shipping address is required.' });
          return;
        }

        try {
          // Ensure home directory exists
          mkdirSync(home, { recursive: true });

          // Encrypt and save vault
          const credentials: BillingCredentials = {
            card: { number: body.card.number, expiry: body.card.expiry, cvv: body.card.cvv },
            name: body.name as string,
            billingAddress: {
              street: (body.billingAddress as Record<string, string>).street,
              city: (body.billingAddress as Record<string, string>).city,
              state: (body.billingAddress as Record<string, string>).state,
              zip: (body.billingAddress as Record<string, string>).zip,
              country: (body.billingAddress as Record<string, string>).country,
            },
            shippingAddress: {
              street: (body.shippingAddress as Record<string, string>).street,
              city: (body.shippingAddress as Record<string, string>).city,
              state: (body.shippingAddress as Record<string, string>).state,
              zip: (body.shippingAddress as Record<string, string>).zip,
              country: (body.shippingAddress as Record<string, string>).country,
            },
            email: body.email as string,
            phone: body.phone as string,
          };

          const credPath = join(home, 'credentials.enc');
          const vault = encrypt(credentials, passphrase);
          saveVault(vault, credPath);

          // Generate and save keypair
          const keysDir = join(home, 'keys');
          mkdirSync(keysDir, { recursive: true });
          const keys = generateKeyPair(passphrase);
          saveKeyPair(keys, join(keysDir, 'public.pem'), join(keysDir, 'private.pem'));

          // Initialize wallet
          const budget = typeof body.budget === 'number' ? body.budget : 0;
          const limitPerTx = typeof body.limitPerTx === 'number' ? body.limitPerTx : 0;
          const bm = new BudgetManager(join(home, 'wallet.json'));
          bm.initWallet(budget, limitPerTx);

          // Audit
          const audit = new AuditLogger(join(home, 'audit.log'));
          audit.log('SETUP', { message: 'credentials encrypted, keypair generated, wallet initialized', source: 'browser-setup' });

        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Setup failed';
          sendJson(res, 500, { error: msg });
          return;
        }

        tokenUsed = true;
        sendJson(res, 200, { ok: true });

        if (!settled) {
          settled = true;
          cleanup();
          resolvePromise({ completed: true });
        }
        return;
      }

      sendJson(res, 404, { error: 'Not found' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal error';
      sendJson(res, 500, { error: message });
    }
  });

  timer = setTimeout(() => {
    if (!settled) {
      settled = true;
      cleanup();
      rejectPromise(new TimeoutError('Setup timed out after 10 minutes.'));
    }
  }, TIMEOUT_MS);

  serverInstance.on('error', (err) => {
    if (!settled) {
      settled = true;
      cleanup();
      rejectPromise(err);
    }
  });

  let portValue = 0;
  const handle: SetupServerHandle = {
    server: serverInstance,
    token: nonce,
    get port() { return portValue; },
    promise,
  };

  serverInstance.listen(0, '127.0.0.1', () => {
    const addr = serverInstance.address();
    if (!addr || typeof addr === 'string') {
      if (!settled) {
        settled = true;
        cleanup();
        rejectPromise(new Error('Failed to bind server'));
      }
      return;
    }
    portValue = addr.port;
    const pageUrl = `http://127.0.0.1:${addr.port}/setup?token=${nonce}`;

    if (options?.openBrowser !== false) {
      console.log('Opening setup form in browser...');
      openBrowser(pageUrl);
    }
  });

  return handle;
}

/**
 * Launch an ephemeral HTTP server on localhost, open a browser page
 * where the human fills in credentials, passphrase, and budget.
 * All sensitive data stays in the browser->server HTTP request on localhost.
 * Never touches stdout/terminal.
 */
export function requestBrowserSetup(home?: string): Promise<SetupResult> {
  const handle = createSetupServer({ openBrowser: true, home });
  return handle.promise;
}
