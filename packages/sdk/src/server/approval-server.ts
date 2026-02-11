import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { getApprovalHtml } from './approval-html.js';
import { openBrowser } from '../utils/open-browser.js';
import { loadPrivateKey } from '../auth/keypair.js';
import { createMandate } from '../auth/mandate.js';
import { TimeoutError } from '../errors.js';
import type { Transaction } from '../transactions/types.js';
import type { TransactionDetails } from '../auth/types.js';
import type { TransactionManager } from '../transactions/manager.js';
import type { AuditLogger } from '../audit/logger.js';

const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const MAX_BODY = 4096;

export interface ApprovalResult {
  action: 'approved' | 'rejected';
  passphrase?: string; // only present on approve, for vault decryption
  reason?: string;     // only present on reject
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

export interface ApprovalServerHandle {
  server: Server;
  token: string;
  port: number;
  promise: Promise<ApprovalResult>;
}

/**
 * Create the ephemeral approval server without opening a browser.
 * Useful for testing — call `requestBrowserApproval` for the full flow.
 */
export function createApprovalServer(
  tx: Transaction,
  tm: TransactionManager,
  audit: AuditLogger,
  options?: { openBrowser?: boolean; home?: string },
): ApprovalServerHandle {
  const nonce = randomBytes(32).toString('hex');
  let settled = false;
  let tokenUsed = false;
  let resolvePromise: (result: ApprovalResult) => void;
  let rejectPromise: (err: Error) => void;
  let timer: ReturnType<typeof setTimeout>;
  let serverInstance: Server;

  const promise = new Promise<ApprovalResult>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  function cleanup(): void {
    clearTimeout(timer);
    serverInstance.close();
  }

  serverInstance = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    const method = req.method ?? 'GET';

    try {
      // GET /approve/:txId?token=X — serve approval page
      if (method === 'GET' && url.pathname === `/approve/${tx.id}`) {
        const token = url.searchParams.get('token');
        if (token !== nonce || tokenUsed) {
          sendHtml(res, '<h1>Invalid or expired link.</h1>');
          return;
        }
        sendHtml(res, getApprovalHtml(nonce, tx));
        return;
      }

      // POST /api/approve — approve with passphrase (server-side signing)
      if (method === 'POST' && url.pathname === '/api/approve') {
        const body = await parseBody(req);
        if (body.token !== nonce || tokenUsed) {
          sendJson(res, 403, { error: 'Invalid or expired token.' });
          return;
        }

        const passphrase = body.passphrase;
        if (typeof passphrase !== 'string' || !passphrase) {
          sendJson(res, 400, { error: 'Passphrase is required.' });
          return;
        }

        // Verify the tx is still pending
        const currentTx = tm.get(tx.id);
        if (!currentTx || currentTx.status !== 'pending') {
          sendJson(res, 400, { error: 'Transaction is no longer pending.' });
          return;
        }

        // Server-side signing: load private key and create mandate
        try {
          const keyPath = options?.home ? join(options.home, 'keys', 'private.pem') : undefined;
          const privateKeyPem = loadPrivateKey(keyPath);
          const txDetails: TransactionDetails = {
            txId: tx.id,
            merchant: tx.merchant,
            amount: tx.amount,
            description: tx.description,
            timestamp: tx.createdAt,
          };
          const mandate = createMandate(txDetails, privateKeyPem, passphrase);
          tm.approve(tx.id, mandate);
          audit.log('APPROVE', { txId: tx.id, source: 'browser-approval', mandateSigned: true });
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Signing failed';
          sendJson(res, 400, { error: msg });
          return;
        }

        tokenUsed = true;
        sendJson(res, 200, { ok: true });

        if (!settled) {
          settled = true;
          cleanup();
          resolvePromise({ action: 'approved', passphrase: passphrase as string });
        }
        return;
      }

      // POST /api/reject — reject the transaction
      if (method === 'POST' && url.pathname === '/api/reject') {
        const body = await parseBody(req);
        if (body.token !== nonce || tokenUsed) {
          sendJson(res, 403, { error: 'Invalid or expired token.' });
          return;
        }

        // Verify the tx is still pending
        const currentTx = tm.get(tx.id);
        if (!currentTx || currentTx.status !== 'pending') {
          sendJson(res, 400, { error: 'Transaction is no longer pending.' });
          return;
        }

        const reason = typeof body.reason === 'string' ? body.reason : undefined;
        tm.reject(tx.id, reason);
        audit.log('REJECT', { txId: tx.id, source: 'browser-approval', reason });

        tokenUsed = true;
        sendJson(res, 200, { ok: true });

        if (!settled) {
          settled = true;
          cleanup();
          resolvePromise({ action: 'rejected', reason });
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
      rejectPromise(new TimeoutError('Approval timed out after 5 minutes.'));
    }
  }, TIMEOUT_MS);

  serverInstance.on('error', (err) => {
    if (!settled) {
      settled = true;
      cleanup();
      rejectPromise(err);
    }
  });

  // We need to wait for listen to get the port, but return synchronously.
  // The promise will resolve/reject based on server events.
  let portValue = 0;
  const handle: ApprovalServerHandle = {
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
    const pageUrl = `http://127.0.0.1:${addr.port}/approve/${tx.id}?token=${nonce}`;

    if (options?.openBrowser !== false) {
      console.log('Opening approval page in browser...');
      openBrowser(pageUrl);
    }
  });

  return handle;
}

/**
 * Launch an ephemeral HTTP server on localhost, open a browser page
 * where the human can approve or deny the transaction.
 * On approve: server-side signing is performed, passphrase returned in result.
 * On deny: transaction is rejected.
 */
export function requestBrowserApproval(
  tx: Transaction,
  tm: TransactionManager,
  audit: AuditLogger,
  home?: string,
): Promise<ApprovalResult> {
  const handle = createApprovalServer(tx, tm, audit, { openBrowser: true, home });
  return handle.promise;
}
