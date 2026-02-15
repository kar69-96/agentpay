import type { BrowserProvider } from './browser-provider.js';

export interface CheckoutResult {
  success: boolean;
  confirmationId?: string;
  error?: string;
}

export interface ExecutorConfig {
  /** Custom browser provider. Defaults to LocalBrowserProvider (local Chromium). */
  provider?: BrowserProvider;
  /** LLM API key for browser-use's AI-driven navigation. */
  modelApiKey?: string;
  /** Model name (e.g. 'claude-sonnet-4-20250514', 'gpt-4o', 'gemini-2.5-flash'). */
  modelName?: string;
  /** Run browser in headless mode. Defaults to true. */
  headless?: boolean;
  /** Max steps for the agent loop. Defaults to 30. */
  maxSteps?: number;
}
