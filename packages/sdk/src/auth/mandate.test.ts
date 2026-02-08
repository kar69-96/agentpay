import { describe, it, expect } from 'vitest';
import { generateKeyPair } from './keypair.js';
import { createMandate, verifyMandate } from './mandate.js';
import type { TransactionDetails } from './types.js';

const passphrase = 'test-keypair-pass!';
const keys = generateKeyPair(passphrase);

const baseTxDetails: TransactionDetails = {
  txId: 'tx_abc12345',
  merchant: 'amazon.com',
  amount: 29.99,
  description: 'Wireless mouse',
  timestamp: '2026-02-08T10:00:00.000Z',
};

describe('keypair', () => {
  it('generates valid PEM strings', () => {
    expect(keys.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
    expect(keys.privateKey).toContain('-----BEGIN ENCRYPTED PRIVATE KEY-----');
  });
});

describe('mandate', () => {
  it('create + verify round-trips', () => {
    const mandate = createMandate(baseTxDetails, keys.privateKey, passphrase);
    expect(verifyMandate(mandate, baseTxDetails)).toBe(true);
  });

  it('fails verification when amount is tampered', () => {
    const mandate = createMandate(baseTxDetails, keys.privateKey, passphrase);
    const tampered = { ...baseTxDetails, amount: 999.99 };
    expect(verifyMandate(mandate, tampered)).toBe(false);
  });

  it('fails verification when signature is tampered', () => {
    const mandate = createMandate(baseTxDetails, keys.privateKey, passphrase);
    // Decode, flip a byte, re-encode to guarantee the signature is actually changed
    const sigBytes = Buffer.from(mandate.signature, 'base64');
    sigBytes[0] ^= 0xff;
    const tampered = { ...mandate, signature: sigBytes.toString('base64') };
    expect(verifyMandate(tampered, baseTxDetails)).toBe(false);
  });

  it('fails verification with wrong public key', () => {
    const otherKeys = generateKeyPair('other-pass');
    const mandate = createMandate(baseTxDetails, keys.privateKey, passphrase);
    const wrongKeyMandate = { ...mandate, publicKey: otherKeys.publicKey };
    expect(verifyMandate(wrongKeyMandate, baseTxDetails)).toBe(false);
  });

  it('throws on wrong passphrase for signing', () => {
    expect(() => createMandate(baseTxDetails, keys.privateKey, 'wrong-pass')).toThrow();
  });

  it('same txDetails produces same hash', () => {
    const mandate1 = createMandate(baseTxDetails, keys.privateKey, passphrase);
    const mandate2 = createMandate(baseTxDetails, keys.privateKey, passphrase);
    expect(mandate1.txHash).toBe(mandate2.txHash);
  });

  it('different txId produces different signature', () => {
    const mandate1 = createMandate(baseTxDetails, keys.privateKey, passphrase);
    const differentTx = { ...baseTxDetails, txId: 'tx_different' };
    const mandate2 = createMandate(differentTx, keys.privateKey, passphrase);
    expect(mandate1.signature).not.toBe(mandate2.signature);
  });

  it('mandate contains expected fields', () => {
    const mandate = createMandate(baseTxDetails, keys.privateKey, passphrase);
    expect(mandate.txId).toBe(baseTxDetails.txId);
    expect(mandate.txHash).toMatch(/^[0-9a-f]{64}$/);
    expect(mandate.signature).toBeTruthy();
    expect(mandate.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
    expect(mandate.timestamp).toBeTruthy();
  });
});
