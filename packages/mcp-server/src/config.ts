import type { ExecutorConfig } from '@useagentpay/sdk';

export interface ServerConfig {
  home?: string;
  passphrase?: string;
  passphraseServer?: string;
  passphraseMode: 'env' | 'server' | 'none';
  executor?: ExecutorConfig;
  http?: boolean;
}

/**
 * Auto-detect an LLM API key from the host environment.
 * Checks common provider env vars in order of preference.
 * Returns the key and a compatible browser-use model name.
 */
function detectModelFromEnv(): { apiKey: string; model: string } | undefined {
  const providers: Array<{ envVars: string[]; model: string }> = [
    { envVars: ['ANTHROPIC_API_KEY'], model: 'claude-sonnet-4-20250514' },
    { envVars: ['OPENAI_API_KEY'], model: 'gpt-4o' },
    { envVars: ['GOOGLE_API_KEY', 'GEMINI_API_KEY'], model: 'gemini-2.5-flash' },
  ];

  for (const { envVars, model } of providers) {
    for (const envVar of envVars) {
      const key = process.env[envVar];
      if (key) {
        return { apiKey: key, model };
      }
    }
  }

  return undefined;
}

export function loadConfig(overrides?: { http?: boolean }): ServerConfig {
  const passphrase = process.env.AGENTPAY_PASSPHRASE;
  const passphraseServer = process.env.AGENTPAY_PASSPHRASE_SERVER;

  let passphraseMode: ServerConfig['passphraseMode'] = 'none';
  if (passphrase) {
    passphraseMode = 'env';
  } else if (passphraseServer) {
    passphraseMode = 'server';
  }

  const detected = detectModelFromEnv();

  const executor: ExecutorConfig = {
    modelApiKey: detected?.apiKey,
    modelName: detected?.model,
  };

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
    'No passphrase configured. Run `agentpay setup` or set AGENTPAY_PASSPHRASE.'
  );
}
