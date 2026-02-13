export interface AgentPayConfig {
  /** When true, approval links are tunneled via Cloudflare for mobile access */
  mobileMode: boolean;
  /** Shell command to send notification. {{url}} is replaced with the approval URL. */
  notifyCommand?: string;
  /** Webhook URL to POST approval payload to */
  notifyWebhook?: string;
}

export const DEFAULT_CONFIG: AgentPayConfig = {
  mobileMode: false,
};
