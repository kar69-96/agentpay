import { spawn, type ChildProcess } from 'node:child_process';

export interface TunnelHandle {
  url: string;
  close: () => void;
}

/**
 * Expose a local port via a public HTTPS tunnel using Cloudflare Quick Tunnels.
 *
 * Requires `cloudflared` to be installed on the system. No Cloudflare account
 * needed — quick tunnels generate a random `*.trycloudflare.com` URL.
 *
 * The tunnel process is spawned as a child process and killed when `close()` is called.
 */
export async function openTunnel(port: number): Promise<TunnelHandle> {
  return new Promise<TunnelHandle>((resolve, reject) => {
    let child: ChildProcess;
    try {
      child = spawn('cloudflared', ['tunnel', '--url', `http://127.0.0.1:${port}`], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch {
      reject(new Error(
        'cloudflared is required for mobile approval. Install it: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/',
      ));
      return;
    }

    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        child.kill();
        reject(new Error('cloudflared tunnel timed out waiting for URL (15s). Is cloudflared installed?'));
      }
    }, 15_000);

    const close = () => {
      child.kill();
    };

    // cloudflared prints the tunnel URL to stderr
    const chunks: string[] = [];
    child.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      chunks.push(text);

      // Look for the trycloudflare.com URL in output
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match && !resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve({ url: match[0], close });
      }
    });

    child.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(new Error(
          `cloudflared failed to start: ${err.message}. Install it: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/`,
        ));
      }
    });

    child.on('exit', (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        const output = chunks.join('');
        reject(new Error(
          `cloudflared exited with code ${code}. Output: ${output.slice(0, 500)}`,
        ));
      }
    });
  });
}
