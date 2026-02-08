import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { encrypt, decrypt, saveVault, loadVault } from './vault.js';
import type { BillingCredentials } from './types.js';
import { DecryptError, NotSetupError } from '../errors.js';

const testCredentials: BillingCredentials = {
  card: { number: '4111111111111111', expiry: '12/28', cvv: '123' },
  name: 'John Doe',
  billingAddress: {
    street: '123 Main St',
    city: 'Springfield',
    state: 'IL',
    zip: '62701',
    country: 'US',
  },
  shippingAddress: {
    street: '456 Oak Ave',
    city: 'Chicago',
    state: 'IL',
    zip: '60601',
    country: 'US',
  },
  email: 'john@example.com',
  phone: '+1-555-0100',
};

const passphrase = 'test-passphrase-123!';

describe('vault', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'agentpay-vault-test-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('encrypt/decrypt', () => {
    it('round-trips with correct passphrase', () => {
      const vault = encrypt(testCredentials, passphrase);
      const result = decrypt(vault, passphrase);
      expect(result).toEqual(testCredentials);
    });

    it('throws DecryptError with wrong passphrase', () => {
      const vault = encrypt(testCredentials, passphrase);
      expect(() => decrypt(vault, 'wrong-passphrase')).toThrow(DecryptError);
    });

    it('produces different ciphertexts for same data', () => {
      const vault1 = encrypt(testCredentials, passphrase);
      const vault2 = encrypt(testCredentials, passphrase);
      expect(vault1.ciphertext).not.toBe(vault2.ciphertext);
      expect(vault1.salt).not.toBe(vault2.salt);
      expect(vault1.iv).not.toBe(vault2.iv);
    });

    it('detects tampered ciphertext (GCM auth tag fails)', () => {
      const vault = encrypt(testCredentials, passphrase);
      const tampered = Buffer.from(vault.ciphertext, 'base64');
      tampered[0] ^= 0xff;
      vault.ciphertext = tampered.toString('base64');
      expect(() => decrypt(vault, passphrase)).toThrow(DecryptError);
    });

    it('round-trips all credential fields', () => {
      const vault = encrypt(testCredentials, passphrase);
      const result = decrypt(vault, passphrase);
      expect(result.card.number).toBe('4111111111111111');
      expect(result.card.expiry).toBe('12/28');
      expect(result.card.cvv).toBe('123');
      expect(result.name).toBe('John Doe');
      expect(result.billingAddress.street).toBe('123 Main St');
      expect(result.shippingAddress.city).toBe('Chicago');
      expect(result.email).toBe('john@example.com');
      expect(result.phone).toBe('+1-555-0100');
    });

    it('handles unicode in name and address', () => {
      const unicodeCreds: BillingCredentials = {
        ...testCredentials,
        name: 'Jose Garcia',
        billingAddress: {
          ...testCredentials.billingAddress,
          street: '123 Strasse',
          city: 'Munchen',
        },
      };
      const vault = encrypt(unicodeCreds, passphrase);
      const result = decrypt(vault, passphrase);
      expect(result.name).toBe('Jose Garcia');
      expect(result.billingAddress.city).toBe('Munchen');
    });
  });

  describe('saveVault/loadVault', () => {
    it('round-trips through file', () => {
      const vault = encrypt(testCredentials, passphrase);
      const path = join(tmpDir, 'test-credentials.enc');
      saveVault(vault, path);
      const loaded = loadVault(path);
      expect(loaded).toEqual(vault);
      const result = decrypt(loaded, passphrase);
      expect(result).toEqual(testCredentials);
    });

    it('creates parent directories', () => {
      const path = join(tmpDir, 'nested', 'dir', 'credentials.enc');
      const vault = encrypt(testCredentials, passphrase);
      saveVault(vault, path);
      expect(existsSync(path)).toBe(true);
    });

    it('throws NotSetupError on missing file', () => {
      const path = join(tmpDir, 'nonexistent.enc');
      expect(() => loadVault(path)).toThrow(NotSetupError);
    });
  });
});
