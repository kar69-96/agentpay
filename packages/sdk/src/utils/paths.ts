import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

export function getHomePath(): string {
  if (process.env.AGENTPAY_HOME) return process.env.AGENTPAY_HOME;
  const local = join(process.cwd(), 'agentpay');
  if (existsSync(local)) return local;
  return join(homedir(), '.agentpay');
}

export function getCredentialsPath(): string {
  return join(getHomePath(), 'credentials.enc');
}

export function getKeysPath(): string {
  return join(getHomePath(), 'keys');
}

export function getPublicKeyPath(): string {
  return join(getKeysPath(), 'public.pem');
}

export function getPrivateKeyPath(): string {
  return join(getKeysPath(), 'private.pem');
}

export function getWalletPath(): string {
  return join(getHomePath(), 'wallet.json');
}

export function getTransactionsPath(): string {
  return join(getHomePath(), 'transactions.json');
}

export function getAuditPath(): string {
  return join(getHomePath(), 'audit.log');
}
