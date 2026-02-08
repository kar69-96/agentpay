import { homedir } from 'node:os';
import { join } from 'node:path';

export function getHomePath(): string {
  return process.env.AGENTPAY_HOME || join(homedir(), '.agentpay');
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
