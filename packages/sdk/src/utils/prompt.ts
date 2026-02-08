import { createInterface } from 'node:readline';
import type { PassphraseContext } from '../server/passphrase-html.js';

export type { PassphraseContext } from '../server/passphrase-html.js';

function createRl() {
  return createInterface({ input: process.stdin, output: process.stdout });
}

export function promptInput(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createRl();
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function promptPassphrase(prompt = 'Passphrase: '): Promise<string> {
  // In a real terminal we'd hide input; for simplicity use standard prompt
  return promptInput(prompt);
}

export function promptConfirm(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = createRl();
    rl.question(`${question} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes');
    });
  });
}

/**
 * Collect passphrase safely: uses terminal prompt when stdin is a TTY,
 * otherwise opens a browser page so the human can enter it directly
 * (keeping the passphrase out of the agent's context).
 */
export async function promptPassphraseSafe(context?: PassphraseContext): Promise<string> {
  if (process.stdin.isTTY) {
    return promptPassphrase('Enter passphrase: ');
  }
  // Dynamic import to avoid loading server code when not needed
  const { collectPassphrase } = await import('../server/passphrase-server.js');
  return collectPassphrase(context);
}
