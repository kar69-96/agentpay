import { Stagehand } from '@browserbasehq/stagehand';
import type { BrowserProvider } from '../browser-provider.js';

/**
 * Default browser provider — runs Chromium locally via Playwright.
 * No cloud browser service needed.
 */
export class LocalBrowserProvider implements BrowserProvider {
  createStagehand(modelApiKey?: string): Stagehand {
    return new Stagehand({
      env: 'LOCAL',
      model: modelApiKey
        ? { modelName: 'claude-3-7-sonnet-latest', apiKey: modelApiKey }
        : undefined,
    });
  }

  async close(): Promise<void> {
    // No cleanup needed for local mode
  }
}
