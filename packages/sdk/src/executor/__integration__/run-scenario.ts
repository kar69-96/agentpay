import type { CheckoutProvider } from './provider.js';
import type { CheckoutScenario } from './scenarios.js';
import type { StepName, StepResult, ScenarioResult } from './scoring.js';
import { computeScore } from './scoring.js';

async function runStep(
  name: StepName,
  fn: () => Promise<void>,
  provider: CheckoutProvider,
): Promise<StepResult> {
  const start = Date.now();
  try {
    await fn();
    return {
      step: name,
      success: true,
      durationMs: Date.now() - start,
      pageUrl: safeUrl(provider),
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    let screenshotPath: string | undefined;
    try {
      // Attempt screenshot on failure for debugging
      const buf = await provider.page().screenshot();
      screenshotPath = `screenshot-${name}-${Date.now()}.png`;
      const { writeFileSync } = await import('node:fs');
      writeFileSync(screenshotPath, buf);
    } catch {
      // Screenshot may fail if browser crashed
    }
    return {
      step: name,
      success: false,
      durationMs: Date.now() - start,
      error: errorMsg,
      screenshotPath,
      pageUrl: safeUrl(provider),
    };
  }
}

function safeUrl(provider: CheckoutProvider): string | undefined {
  try {
    return provider.page().url();
  } catch {
    return undefined;
  }
}

export async function runScenario(
  provider: CheckoutProvider,
  scenario: CheckoutScenario,
): Promise<ScenarioResult> {
  const steps: StepResult[] = [];
  const overallStart = Date.now();

  const isCritical = (step: StepName) => scenario.criticalSteps.includes(step);

  const addStep = async (name: StepName, fn: () => Promise<void>): Promise<boolean> => {
    const result = await runStep(name, fn, provider);
    steps.push(result);
    if (!result.success && isCritical(name)) return false;
    return true;
  };

  try {
    // 1. Init
    if (!(await addStep('init', () => provider.init()))) {
      return finish(scenario.name, steps, overallStart);
    }

    // 2. Navigate
    if (
      !(await addStep('navigate', async () => {
        await provider.page().goto(scenario.url);
        await provider.page().waitForTimeout(2000);
      }))
    ) {
      return finish(scenario.name, steps, overallStart);
    }

    // 3. Pre-steps (login, etc.)
    if (scenario.preSteps && scenario.preSteps.length > 0) {
      if (
        !(await addStep('pre-steps', async () => {
          for (const step of scenario.preSteps!) {
            const result = await provider.act(step.instruction, {
              variables: step.variables,
            });
            if (!result.success) throw new Error(result.message);
            await provider.page().waitForTimeout(1500);
          }
        }))
      ) {
        return finish(scenario.name, steps, overallStart);
      }
    }

    // 4. Product selection
    if (
      !(await addStep('product-selection', async () => {
        const result = await provider.act(scenario.productSelection);
        if (!result.success) throw new Error(result.message);
        await provider.page().waitForTimeout(2000);
      }))
    ) {
      if (isCritical('product-selection'))
        return finish(scenario.name, steps, overallStart);
    }

    // 5. Cart population
    if (
      !(await addStep('cart-population', async () => {
        const result = await provider.act(scenario.cartPopulation);
        if (!result.success) throw new Error(result.message);
        await provider.page().waitForTimeout(2000);
      }))
    ) {
      if (isCritical('cart-population'))
        return finish(scenario.name, steps, overallStart);
    }

    // 6. Checkout navigation
    if (
      !(await addStep('checkout-navigation', async () => {
        const result = await provider.act(scenario.checkoutNavigation);
        if (!result.success) throw new Error(result.message);
        await provider.page().waitForTimeout(2000);
      }))
    ) {
      if (isCritical('checkout-navigation'))
        return finish(scenario.name, steps, overallStart);
    }

    // 7. Form fill
    await addStep('form-fill', async () => {
      const result = await provider.act(scenario.formFill.instruction, {
        variables: scenario.formFill.variables,
      });
      if (!result.success) throw new Error(result.message);
      await provider.page().waitForTimeout(3000);
    });

    // 8. Confirmation extraction
    await addStep('confirmation-extraction', async () => {
      const extracted = await provider.extract(scenario.confirmationExtract);
      const hasConfirmation = Object.values(extracted).some(
        (v) => v !== null && v !== undefined && v !== '' && v !== 'UNKNOWN',
      );
      if (!hasConfirmation) throw new Error('No confirmation data extracted');
    });
  } finally {
    await provider.close();
  }

  return finish(scenario.name, steps, overallStart);
}

function finish(
  scenarioName: string,
  steps: StepResult[],
  overallStart: number,
): ScenarioResult {
  const score = computeScore(steps);
  const completed = steps.every((s) => s.success);
  return {
    scenarioName,
    score,
    completed,
    steps,
    totalDurationMs: Date.now() - overallStart,
  };
}
