import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes } from 'node:crypto';
import { getPassphraseHtml, type PassphraseContext } from './passphrase-html.js';
import { openBrowser } from '../utils/open-browser.js';
import { TimeoutError } from '../errors.js';

const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const MAX_BODY = 4096;

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

export type { PassphraseContext } from './passphrase-html.js';

/**
 * Launch an ephemeral HTTP server on localhost, open a browser page
 * where the human enters their passphrase, and return it.
 * The passphrase never appears in stdout/stderr.
 */
export function collectPassphrase(context?: PassphraseContext): Promise<string> {
  return new Promise((resolve, reject) => {
    const nonce = randomBytes(32).toString('hex');
    let settled = false;

    const server = createServer(async (req, res) => {
      const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
      const method = req.method ?? 'GET';

      try {
        if (method === 'GET' && url.pathname === '/passphrase') {
          const token = url.searchParams.get('token');
          if (token !== nonce) {
            sendHtml(res, '<h1>Invalid or expired link.</h1>');
            return;
          }
          sendHtml(res, getPassphraseHtml(nonce, context));
        } else if (method === 'POST' && url.pathname === '/passphrase') {
          const body = await parseBody(req);
          if (body.token !== nonce) {
            sendJson(res, 403, { error: 'Invalid token.' });
            return;
          }
          const passphrase = body.passphrase;
          if (typeof passphrase !== 'string' || !passphrase) {
            sendJson(res, 400, { error: 'Passphrase is required.' });
            return;
          }
          sendJson(res, 200, { ok: true });

          if (!settled) {
            settled = true;
            cleanup();
            resolve(passphrase);
          }
        } else {
          sendJson(res, 404, { error: 'Not found' });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Internal error';
        sendJson(res, 500, { error: message });
      }
    });

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(new TimeoutError('Passphrase entry timed out after 5 minutes.'));
      }
    }, TIMEOUT_MS);

    function cleanup(): void {
      clearTimeout(timer);
      server.close();
    }

    server.on('error', (err) => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(err);
      }
    });

    // Bind to localhost on a random available port
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        if (!settled) {
          settled = true;
          cleanup();
          reject(new Error('Failed to bind server'));
        }
        return;
      }
      const url = `http://127.0.0.1:${addr.port}/passphrase?token=${nonce}`;
      console.log('Waiting for passphrase entry in browser...');
      openBrowser(url);
    });
  });
}
