import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { getDashboardHtml } from './html.js';
import { handleGetStatus, handlePostSetup, handlePostFund } from './routes.js';

const MAX_BODY = 1_048_576; // 1 MB

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

export function startServer(port: number): Promise<ReturnType<typeof createServer>> {
  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      const url = req.url ?? '/';
      const method = req.method ?? 'GET';

      try {
        if (method === 'GET' && url === '/api/status') {
          const result = handleGetStatus();
          sendJson(res, result.status, result.body);
        } else if (method === 'POST' && url === '/api/setup') {
          const body = await parseBody(req);
          const result = handlePostSetup(body as unknown as Parameters<typeof handlePostSetup>[0]);
          sendJson(res, result.status, result.body);
        } else if (method === 'POST' && url === '/api/fund') {
          const body = await parseBody(req);
          const result = handlePostFund(body as unknown as Parameters<typeof handlePostFund>[0]);
          sendJson(res, result.status, result.body);
        } else if (method === 'GET' && (url === '/' || url === '/index.html')) {
          sendHtml(res, getDashboardHtml());
        } else {
          sendJson(res, 404, { error: 'Not found' });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Internal error';
        sendJson(res, 500, { error: message });
      }
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`Port ${port} is already in use. Try a different port with --port <number>.`));
      } else {
        reject(err);
      }
    });

    server.listen(port, '127.0.0.1', () => {
      resolve(server);
    });
  });
}
