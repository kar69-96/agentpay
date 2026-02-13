import { describe, it, expect } from 'vitest';
import { generateAgentMd } from '../templates/agent-md.js';

describe('AGENT.md template', () => {
  const content = generateAgentMd();

  it('generates valid markdown with a heading', () => {
    expect(content).toMatch(/^# AgentPay/);
  });

  it('includes all MCP tool names', () => {
    const tools = [
      'agentpay_status',
      'agentpay_check_balance',
      'agentpay_propose_purchase',
      'agentpay_request_mobile_approval',
      'agentpay_wait_for_approval',
      'agentpay_execute_purchase',
      'agentpay_get_receipt',
      'agentpay_list_pending',
      'agentpay_get_transaction',
    ];
    for (const tool of tools) {
      expect(content).toContain(tool);
    }
  });

  it('includes CLI commands for humans', () => {
    expect(content).toContain('npx -p @useagentpay/mcp-server agentpay setup');
    expect(content).toContain('npx -p @useagentpay/mcp-server agentpay dashboard');
    expect(content).toContain('npx -p @useagentpay/mcp-server agentpay mobile on');
    expect(content).toContain('npx -p @useagentpay/mcp-server agentpay mobile off');
  });

  it('includes mobile mode section', () => {
    expect(content).toContain('## Mobile Mode');
    expect(content).toContain('mobileMode');
    expect(content).toContain('Cloudflare Tunnel');
  });

  it('includes dashboard-only configuration section', () => {
    expect(content).toContain('Dashboard');
    expect(content).toContain('ONLY be changed through the browser dashboard');
    expect(content).toContain('CANNOT modify budgets');
  });

  it('includes rules section', () => {
    expect(content).toContain('## Rules');
    expect(content).toContain('Always check balance before proposing');
    expect(content).toContain('open the dashboard');
  });
});
