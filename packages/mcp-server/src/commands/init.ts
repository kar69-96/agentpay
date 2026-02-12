import { mkdirSync, existsSync } from 'node:fs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateAgentMd } from '../templates/agent-md.js';

export function initCommand(): void {
  const dir = join(process.cwd(), 'agentpay');

  if (existsSync(dir)) {
    console.log(`AgentPay already initialized at ${dir}`);
    return;
  }

  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'AGENT.md'), generateAgentMd(), 'utf-8');

  console.log('AgentPay initialized. Run `agentpay setup` to add your payment credentials.');
}
