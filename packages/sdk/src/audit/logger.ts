import { appendFileSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { getAuditPath } from '../utils/paths.js';

export class AuditLogger {
  private logPath: string;

  constructor(logPath?: string) {
    this.logPath = logPath ?? getAuditPath();
  }

  log(action: string, details: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    const detailsStr = JSON.stringify(details);
    const entry = `${timestamp}\t${action}\t${detailsStr}\n`;
    mkdirSync(dirname(this.logPath), { recursive: true });
    appendFileSync(this.logPath, entry, { mode: 0o600 });
  }

  getLog(): string[] {
    try {
      const data = readFileSync(this.logPath, 'utf8');
      return data.trim().split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }
}
