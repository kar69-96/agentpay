import type { BrowserSession } from 'browser-use';
import type { BaseChatModel } from 'browser-use/llm/base';

/**
 * Abstraction over how a browser session and LLM are created.
 * Implement this interface to plug in a custom browser backend
 * (e.g. cloud Playwright, Browserbase, etc.).
 */
export interface BrowserProvider {
  createSession(headless?: boolean): BrowserSession;
  createLLM(apiKey?: string, modelName?: string): BaseChatModel;
  close(): Promise<void>;
}
