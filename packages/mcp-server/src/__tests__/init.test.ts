import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('init command', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'agentpay-init-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates ./agentpay/ directory with AGENT.md', async () => {
    const { initCommand } = await import('../commands/init.js');
    initCommand();

    const agentpayDir = join(tempDir, 'agentpay');
    expect(existsSync(agentpayDir)).toBe(true);
    expect(existsSync(join(agentpayDir, 'AGENT.md'))).toBe(true);
  });

  it('AGENT.md contains expected content', async () => {
    const { initCommand } = await import('../commands/init.js');
    initCommand();

    const content = readFileSync(join(tempDir, 'agentpay', 'AGENT.md'), 'utf-8');
    expect(content).toContain('# AgentPay');
    expect(content).toContain('agentpay_status');
    expect(content).toContain('agentpay_propose_purchase');
    expect(content).toContain('agentpay_execute_purchase');
    expect(content).toContain('npx -p @useagentpay/mcp-server agentpay setup');
  });

  it('is idempotent — does not error if ./agentpay/ already exists', async () => {
    const { initCommand } = await import('../commands/init.js');
    initCommand();
    // Second call should not throw
    expect(() => initCommand()).not.toThrow();
  });
});
