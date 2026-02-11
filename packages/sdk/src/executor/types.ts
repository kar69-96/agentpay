import type { BrowserProvider } from './browser-provider.js';

export interface CheckoutResult {
  success: boolean;
  confirmationId?: string;
  error?: string;
}

export interface ExecutorConfig {
  /** Custom browser provider. Defaults to LocalBrowserProvider (local Chromium). */
  provider?: BrowserProvider;
  /** LLM API key for Stagehand's AI-driven navigation (e.g. ANTHROPIC_API_KEY). */
  modelApiKey?: string;
}
