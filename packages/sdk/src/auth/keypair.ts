import { generateKeyPairSync, createPublicKey } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { KeyPair } from './types.js';
import { getPublicKeyPath, getPrivateKeyPath } from '../utils/paths.js';

export function generateKeyPair(passphrase: string): KeyPair {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase,
    },
  });

  return { publicKey, privateKey };
}

export function saveKeyPair(keys: KeyPair, publicPath?: string, privatePath?: string): void {
  const pubPath = publicPath ?? getPublicKeyPath();
  const privPath = privatePath ?? getPrivateKeyPath();

  mkdirSync(dirname(pubPath), { recursive: true });
  writeFileSync(pubPath, keys.publicKey, { mode: 0o644 });
  writeFileSync(privPath, keys.privateKey, { mode: 0o600 });
}

export function loadPublicKey(path?: string): string {
  return readFileSync(path ?? getPublicKeyPath(), 'utf8');
}

export function loadPrivateKey(path?: string): string {
  return readFileSync(path ?? getPrivateKeyPath(), 'utf8');
}
