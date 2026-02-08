import { describe, it, afterAll, expect } from 'vitest';
import { StagehandProvider } from './stagehand-provider.js';
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
        const provider = new StagehandProvider();
        const result = await runScenario(provider, scenario);
        allResults.push(result);

        // Baseline: product selection must succeed
        const productStep = result.steps.find(
          (s) => s.step === 'product-selection',
        );
        if (productStep) {
          expect(productStep.success).toBe(true);
        }
      },
      { timeout: scenario.timeoutMs + 30_000 },
    );
  }
});
