import type { Stagehand } from '@browserbasehq/stagehand';

/**
 * Abstraction over how a Stagehand browser instance is created.
 * Implement this interface to plug in a custom browser backend
 * (e.g. Browserbase, cloud Playwright, etc.).
 */
export interface BrowserProvider {
  createStagehand(modelApiKey?: string): Stagehand;
  close(): Promise<void>;
}
