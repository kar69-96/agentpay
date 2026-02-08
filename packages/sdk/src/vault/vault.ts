import { pbkdf2Sync, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { BillingCredentials, EncryptedVault } from './types.js';
import { DecryptError, NotSetupError } from '../errors.js';
import { getCredentialsPath } from '../utils/paths.js';

const ALGORITHM = 'aes-256-gcm';
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_DIGEST = 'sha512';
const KEY_LENGTH = 32;
const SALT_LENGTH = 32;
const IV_LENGTH = 16;

export function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return pbkdf2Sync(passphrase, salt, PBKDF2_ITERATIONS, KEY_LENGTH, PBKDF2_DIGEST);
}

export function encrypt(credentials: BillingCredentials, passphrase: string): EncryptedVault {
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const key = deriveKey(passphrase, salt);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const plaintext = JSON.stringify(credentials);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: Buffer.concat([encrypted, authTag]).toString('base64'),
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
  };
}

export function decrypt(vault: EncryptedVault, passphrase: string): BillingCredentials {
  try {
    const salt = Buffer.from(vault.salt, 'base64');
    const iv = Buffer.from(vault.iv, 'base64');
    const data = Buffer.from(vault.ciphertext, 'base64');
    const key = deriveKey(passphrase, salt);

    const authTag = data.subarray(data.length - 16);
    const ciphertext = data.subarray(0, data.length - 16);

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

    return JSON.parse(decrypted.toString('utf8')) as BillingCredentials;
  } catch {
    throw new DecryptError();
  }
}

export function saveVault(vault: EncryptedVault, path?: string): void {
  const filePath = path ?? getCredentialsPath();
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(vault, null, 2), { mode: 0o600 });
}

export function loadVault(path?: string): EncryptedVault {
  const filePath = path ?? getCredentialsPath();
  try {
    const data = readFileSync(filePath, 'utf8');
    return JSON.parse(data) as EncryptedVault;
  } catch {
    throw new NotSetupError();
  }
}
