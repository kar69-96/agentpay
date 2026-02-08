import { Stagehand } from '@browserbasehq/stagehand';
import type { CheckoutProvider, PageHandle, ActResult } from './provider.js';

export class StagehandProvider implements CheckoutProvider {
  readonly name = 'stagehand';
  private stagehand: Stagehand | null = null;

  async init(): Promise<void> {
    const useBrowserbase =
      !!process.env.BROWSERBASE_API_KEY && !!process.env.BROWSERBASE_PROJECT_ID;

    this.stagehand = new Stagehand({
      env: useBrowserbase ? 'BROWSERBASE' : 'LOCAL',
      ...(useBrowserbase && {
        apiKey: process.env.BROWSERBASE_API_KEY,
        projectId: process.env.BROWSERBASE_PROJECT_ID,
      }),
      localBrowserLaunchOptions: {
        headless: process.env.HEADLESS !== 'false',
      },
      verbose: process.env.VERBOSE === '1' ? 1 : 0,
      disablePino: true,
      model: {
        modelName: 'claude-3-7-sonnet-latest' as any,
        apiKey: process.env.ANTHROPIC_API_KEY!,
      },
    });

    await this.stagehand.init();
  }

  page(): PageHandle {
    if (!this.stagehand) throw new Error('Provider not initialized');
    const raw = this.stagehand.context.activePage()!;
    return {
      goto: (url: string) => raw.goto(url).then(() => {}),
      url: () => raw.url(),
      evaluate: <R>(fn: (arg: any) => R, arg?: unknown) =>
        raw.evaluate(fn as any, arg as any) as Promise<R>,
      waitForTimeout: (ms: number) => raw.waitForTimeout(ms),
      screenshot: () => raw.screenshot({ type: 'png' }) as Promise<Buffer>,
    };
  }

  async act(
    instruction: string,
    options?: { variables?: Record<string, string> },
  ): Promise<ActResult> {
    if (!this.stagehand) throw new Error('Provider not initialized');
    try {
      const result = await this.stagehand.act(instruction, options);
      return {
        success: result?.success ?? true,
        message: result?.message ?? 'Action completed',
      };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Unknown act error',
      };
    }
  }

  async extract(instruction: string): Promise<Record<string, unknown>> {
    if (!this.stagehand) throw new Error('Provider not initialized');
    const result = await this.stagehand.extract(instruction);
    return (typeof result === 'object' && result !== null ? result : { extraction: result }) as Record<string, unknown>;
  }

  async close(): Promise<void> {
    try {
      if (this.stagehand) {
        await this.stagehand.close();
        this.stagehand = null;
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}
