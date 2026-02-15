import { describe, it, afterAll, expect } from 'vitest';
import { scenarios } from './scenarios.js';
import { runScenario } from './run-scenario.js';
import { formatReport, type ScenarioResult } from './scoring.js';

const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

const allResults: ScenarioResult[] = [];

describe.skipIf(!hasApiKey)('Checkout Integration Tests', () => {
  afterAll(() => {
    if (allResults.length > 0) {
      console.log(formatReport(allResults));
    }
  });

  for (const scenario of scenarios) {
    it(
      scenario.name,
      async () => {
        const result = await runScenario(scenario);
        allResults.push(result);
        expect(result.passed).toBe(true);
      },
      { timeout: scenario.timeoutMs + 30_000 },
    );
  }
});
