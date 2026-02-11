import type { ExecutorConfig } from '@useagentpay/sdk';

export interface ServerConfig {
  home?: string;
  passphrase?: string;
  passphraseServer?: string;
  passphraseMode: 'env' | 'server' | 'none';
  executor?: ExecutorConfig;
  http?: boolean;
}

export function loadConfig(overrides?: { http?: boolean }): ServerConfig {
  const passphrase = process.env.AGENTPAY_PASSPHRASE;
  const passphraseServer = process.env.AGENTPAY_PASSPHRASE_SERVER;

  let passphraseMode: ServerConfig['passphraseMode'] = 'none';
  if (passphrase) passphraseMode = 'env';
  else if (passphraseServer) passphraseMode = 'server';

  const hasDirectKeys = !!(process.env.BROWSERBASE_API_KEY && process.env.BROWSERBASE_PROJECT_ID);
  const hasProxy = !!process.env.AGENTPAY_PROXY_URL;

  const executor: ExecutorConfig | undefined =
    hasDirectKeys || hasProxy
      ? {
          browserbaseApiKey: process.env.BROWSERBASE_API_KEY,
          browserbaseProjectId: process.env.BROWSERBASE_PROJECT_ID,
          proxyUrl: process.env.AGENTPAY_PROXY_URL,
        }
      : undefined;

  return {
    home: process.env.AGENTPAY_HOME || undefined,
    passphrase,
    passphraseServer,
    passphraseMode,
    executor,
    http: overrides?.http ?? process.env.MCP_TRANSPORT === 'http',
  };
}

export async function getPassphrase(config: ServerConfig): Promise<string> {
  if (config.passphraseMode === 'env' && config.passphrase) {
    return config.passphrase;
  }

  if (config.passphraseMode === 'server' && config.passphraseServer) {
    const res = await fetch(config.passphraseServer);
    if (!res.ok) throw new Error(`Passphrase server returned ${res.status}`);
    const body = await res.text();
    return body.trim();
  }

  throw new Error(
    'No passphrase configured. Set AGENTPAY_PASSPHRASE or AGENTPAY_PASSPHRASE_SERVER to enable purchase execution.'
  );
}
