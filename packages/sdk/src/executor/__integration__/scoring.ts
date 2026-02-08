export type StepName =
  | 'init'
  | 'navigate'
  | 'pre-steps'
  | 'product-selection'
  | 'cart-population'
  | 'checkout-navigation'
  | 'form-fill'
  | 'confirmation-extraction';

export interface StepResult {
  step: StepName;
  success: boolean;
  durationMs: number;
  error?: string;
  screenshotPath?: string;
  pageUrl?: string;
}

export interface ScenarioResult {
  scenarioName: string;
  score: number;
  completed: boolean;
  steps: StepResult[];
  totalDurationMs: number;
}

export function computeScore(steps: StepResult[]): number {
  if (steps.length === 0) return 0;
  const passed = steps.filter((s) => s.success).length;
  return Math.round((passed / steps.length) * 100) / 100;
}

export function formatReport(results: ScenarioResult[]): string {
  const lines: string[] = [];
  lines.push('');
  lines.push('='.repeat(60));
  lines.push('  CHECKOUT INTEGRATION TEST REPORT');
  lines.push('='.repeat(60));
  lines.push('');

  for (const r of results) {
    const icon = r.completed ? 'PASS' : 'FAIL';
    lines.push(`[${icon}] ${r.scenarioName}  —  score: ${r.score}  (${formatMs(r.totalDurationMs)})`);

    for (const s of r.steps) {
      const stepIcon = s.success ? '+' : 'x';
      const durStr = formatMs(s.durationMs);
      let line = `  [${stepIcon}] ${s.step.padEnd(24)} ${durStr}`;
      if (s.error) line += `  ERR: ${s.error.slice(0, 80)}`;
      lines.push(line);
    }
    lines.push('');
  }

  const total = results.length;
  const passed = results.filter((r) => r.completed).length;
  const avgScore =
    results.length > 0
      ? Math.round((results.reduce((sum, r) => sum + r.score, 0) / total) * 100) / 100
      : 0;

  lines.push('-'.repeat(60));
  lines.push(`  ${passed}/${total} scenarios fully completed   avg score: ${avgScore}`);
  lines.push('-'.repeat(60));
  lines.push('');

  return lines.join('\n');
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
