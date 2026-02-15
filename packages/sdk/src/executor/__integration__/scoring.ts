export interface ScenarioResult {
  scenarioName: string;
  passed: boolean;
  result: string | null;
  durationMs: number;
  error?: string;
}

export function formatReport(results: ScenarioResult[]): string {
  const lines: string[] = [];
  lines.push('');
  lines.push('='.repeat(60));
  lines.push('  CHECKOUT INTEGRATION TEST REPORT');
  lines.push('='.repeat(60));
  lines.push('');

  for (const r of results) {
    const icon = r.passed ? 'PASS' : 'FAIL';
    lines.push(`[${icon}] ${r.scenarioName}  (${formatMs(r.durationMs)})`);
    if (r.result) {
      lines.push(`  Result: ${r.result.slice(0, 200)}`);
    }
    if (r.error) {
      lines.push(`  Error: ${r.error.slice(0, 200)}`);
    }
    lines.push('');
  }

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;

  lines.push('-'.repeat(60));
  lines.push(`  ${passed}/${total} scenarios passed`);
  lines.push('-'.repeat(60));
  lines.push('');

  return lines.join('\n');
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
