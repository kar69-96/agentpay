import { Agent, BrowserSession, BrowserProfile } from 'browser-use';
import { ChatAnthropic } from 'browser-use/llm/anthropic';
import type { BaseChatModel } from 'browser-use/llm/base';
import type { CheckoutProvider, PageHandle } from './provider.js';

export class BrowserUseProvider implements CheckoutProvider {
  readonly name = 'browser-use';
  private session: BrowserSession | null = null;
  private llm: BaseChatModel | null = null;

  async init(): Promise<void> {
    this.session = new BrowserSession({
      browser_profile: new BrowserProfile({
        headless: process.env.HEADLESS !== 'false',
      }),
    });

    this.llm = new ChatAnthropic({
      model: 'claude-sonnet-4-20250514',
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    // Initialize the browser session
    await this.session.start();
  }

  page(): PageHandle {
    if (!this.session) throw new Error('Provider not initialized');
    const raw = this.session.current_page;
    if (!raw) throw new Error('No active page');
    return {
      goto: (url: string) => raw.goto(url).then(() => {}),
      url: () => raw.url(),
      waitForTimeout: (ms: number) => raw.waitForTimeout(ms),
      screenshot: () => raw.screenshot({ type: 'png' }) as Promise<Buffer>,
    };
  }

  async runTask(task: string, maxSteps = 20): Promise<string | null> {
    if (!this.session || !this.llm) throw new Error('Provider not initialized');

    const agent = new Agent({
      task,
      llm: this.llm,
      browser_session: this.session,
      use_vision: true,
      max_actions_per_step: 4,
      max_failures: 3,
    });

    const history = await agent.run(maxSteps);
    return history.final_result();
  }

  async close(): Promise<void> {
    try {
      if (this.session) {
        await this.session.close();
        this.session = null;
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}
