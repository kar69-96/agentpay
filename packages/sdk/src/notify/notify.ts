import { execFile } from 'node:child_process';

export interface NotifyOptions {
  /** Shell command to run. `{{url}}` is replaced with the approval URL. */
  command?: string;
  /** Webhook URL to POST `{ url, txId, merchant, amount }` to. */
  webhookUrl?: string;
}

export interface NotifyPayload {
  url: string;
  txId: string;
  merchant: string;
  amount: number;
}

/**
 * Send a notification about a pending mobile approval.
 *
 * Supports two delivery methods (both can be used simultaneously):
 * - `command`: Shell command with `{{url}}` placeholder (e.g. send via iMessage, Telegram, etc.)
 * - `webhookUrl`: HTTP POST endpoint that receives JSON payload
 *
 * Returns an array of results (one per delivery method attempted).
 */
export async function sendNotification(
  payload: NotifyPayload,
  options: NotifyOptions,
): Promise<{ method: string; success: boolean; error?: string }[]> {
  const results: { method: string; success: boolean; error?: string }[] = [];

  if (options.command) {
    const cmd = options.command.replace(/\{\{url\}\}/g, payload.url);
    try {
      await runCommand(cmd);
      results.push({ method: 'command', success: true });
    } catch (err) {
      results.push({
        method: 'command',
        success: false,
        error: err instanceof Error ? err.message : 'Command failed',
      });
    }
  }

  if (options.webhookUrl) {
    try {
      const res = await fetch(options.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        results.push({
          method: 'webhook',
          success: false,
          error: `Webhook returned ${res.status}`,
        });
      } else {
        results.push({ method: 'webhook', success: true });
      }
    } catch (err) {
      results.push({
        method: 'webhook',
        success: false,
        error: err instanceof Error ? err.message : 'Webhook failed',
      });
    }
  }

  if (results.length === 0) {
    results.push({
      method: 'none',
      success: false,
      error: 'No notification method configured. Set AGENTPAY_NOTIFY_COMMAND or AGENTPAY_NOTIFY_WEBHOOK.',
    });
  }

  return results;
}

function runCommand(cmd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile('sh', ['-c', cmd], { timeout: 10_000 }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
