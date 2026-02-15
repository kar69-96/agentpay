import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { getHomePath } from '../utils/paths.js';
import { DEFAULT_CONFIG, type AgentPayConfig } from './types.js';

function getConfigPath(home?: string): string {
  return join(home ?? getHomePath(), 'config.json');
}

export function loadConfig(home?: string): AgentPayConfig {
  try {
    const data = readFileSync(getConfigPath(home), 'utf8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: AgentPayConfig, home?: string): void {
  const path = getConfigPath(home);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(config, null, 2), { mode: 0o600 });
}

export function setMobileMode(enabled: boolean, home?: string): AgentPayConfig {
  const config = loadConfig(home);
  config.mobileMode = enabled;
  saveConfig(config, home);
  return config;
}
