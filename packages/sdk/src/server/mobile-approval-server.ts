import { createApprovalServer, type ApprovalResult, type ApprovalServerHandle } from './approval-server.js';
import { openTunnel, type TunnelHandle } from '../tunnel/tunnel.js';
import { sendNotification, type NotifyOptions, type NotifyPayload } from '../notify/notify.js';
import type { Transaction } from '../transactions/types.js';
import type { TransactionManager } from '../transactions/manager.js';
import type { AuditLogger } from '../audit/logger.js';

export interface MobileApprovalOptions {
  /** Notification delivery options */
  notify: NotifyOptions;
  /** AgentPay home directory */
  home?: string;
}

export interface MobileApprovalResult extends ApprovalResult {
  /** Public URL that was sent to the user */
  approvalUrl: string;
  /** Notification delivery results */
  notifyResults: { method: string; success: boolean; error?: string }[];
}

/**
 * Request approval via a publicly accessible URL.
 *
 * Flow:
 * 1. Start the local approval server (no browser opened)
 * 2. Open a tunnel to expose it publicly
 * 3. Send the tunnel URL to the user via configured notification method
 * 4. Wait for the user to approve/reject (same as browser flow)
 * 5. Clean up tunnel when done
 */
export async function requestMobileApproval(
  tx: Transaction,
  tm: TransactionManager,
  audit: AuditLogger,
  options: MobileApprovalOptions,
): Promise<MobileApprovalResult> {
  // 1. Start local approval server WITHOUT opening browser
  const handle: ApprovalServerHandle = createApprovalServer(tx, tm, audit, {
    openBrowser: false,
    home: options.home,
  });

  // Wait for server to be listening (port assigned)
  await waitForPort(handle);

  let tunnel: TunnelHandle | undefined;

  try {
    // 2. Open tunnel to expose local server publicly
    tunnel = await openTunnel(handle.port);

    // 3. Build the public approval URL
    const approvalUrl = `${tunnel.url}/approve/${tx.id}?token=${handle.token}`;

    // 4. Send notification to user
    const payload: NotifyPayload = {
      url: approvalUrl,
      txId: tx.id,
      merchant: tx.merchant,
      amount: tx.amount,
    };
    const notifyResults = await sendNotification(payload, options.notify);

    audit.log('MOBILE_APPROVAL_REQUESTED', {
      txId: tx.id,
      tunnelUrl: tunnel.url,
      notifyResults,
    });

    // 5. Wait for user to approve/reject (or timeout)
    const result = await handle.promise;

    return {
      ...result,
      approvalUrl,
      notifyResults,
    };
  } finally {
    // Always clean up tunnel
    tunnel?.close();
  }
}

/**
 * Wait for the approval server to bind to a port.
 * The server uses port 0 (OS-assigned), so we need to poll until it's ready.
 */
function waitForPort(handle: ApprovalServerHandle, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (handle.port > 0) {
        resolve();
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error('Approval server failed to bind to a port'));
        return;
      }
      setTimeout(check, 50);
    };
    check();
  });
}
