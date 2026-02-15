import { Agent, BrowserSession, BrowserProfile } from 'browser-use';
import { ChatAnthropic } from 'browser-use/llm/anthropic';
import type { CheckoutScenario } from './scenarios.js';
import type { ScenarioResult } from './scoring.js';

export async function runScenario(scenario: CheckoutScenario): Promise<ScenarioResult> {
  const start = Date.now();

  const session = new BrowserSession({
    browser_profile: new BrowserProfile({
      headless: process.env.HEADLESS !== 'false',
    }),
  });

  const llm = new ChatAnthropic({
    model: 'claude-sonnet-4-20250514',
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });

  try {
    const agent = new Agent({
      task: scenario.task,
      llm,
      browser_session: session,
      use_vision: true,
      max_actions_per_step: 4,
      max_failures: 3,
      available_file_paths: [],  // Disable file system to prevent wasted steps on todo.md
      extend_system_message: 'Do NOT create any files. Focus only on browser actions.',
    });

    const history = await agent.run(scenario.maxSteps);
    const result = history.final_result();
    const success = history.is_successful();

    // Check if result contains any success indicators
    const resultLower = (result || '').toLowerCase();
    const hasIndicator = scenario.successIndicators.some((ind) =>
      resultLower.includes(ind.toLowerCase()),
    );

    const passed = (success ?? false) || hasIndicator;

    return {
      scenarioName: scenario.name,
      passed,
      result,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      scenarioName: scenario.name,
      passed: false,
      result: null,
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    try {
      await session.close();
    } catch {
      // Ignore cleanup errors
    }
  }
}
