/**
 * Web Crypto API AES-256-GCM encryption — cross-compatible with Node.js SDK vault.
 * Same format: { ciphertext: base64, salt: base64, iv: base64 }
 */

const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH = 256;
const SALT_LENGTH = 32;
const IV_LENGTH = 16;

function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function deriveKey(passphrase: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-512',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  );
}

export interface EncryptedVault {
  ciphertext: string;
  salt: string;
  iv: string;
}

export async function encrypt(data: unknown, passphrase: string): Promise<EncryptedVault> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(passphrase, salt.buffer as ArrayBuffer);

  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify(data));

  // AES-GCM appends auth tag to ciphertext automatically in Web Crypto
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    plaintext,
  );

  return {
    ciphertext: bufferToBase64(encrypted),
    salt: bufferToBase64(salt.buffer as ArrayBuffer),
    iv: bufferToBase64(iv.buffer as ArrayBuffer),
  };
}

export async function decrypt<T = unknown>(vault: EncryptedVault, passphrase: string): Promise<T> {
  const salt = base64ToBuffer(vault.salt);
  const iv = base64ToBuffer(vault.iv);
  const ciphertext = base64ToBuffer(vault.ciphertext);
  const key = await deriveKey(passphrase, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  );

  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(decrypted)) as T;
}
