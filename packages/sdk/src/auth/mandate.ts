import { createHash, createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';
import type { PurchaseMandate, TransactionDetails } from './types.js';
import { InvalidMandateError } from '../errors.js';

function hashTransactionDetails(details: TransactionDetails): string {
  const canonical = JSON.stringify({
    txId: details.txId,
    merchant: details.merchant,
    amount: details.amount,
    description: details.description,
    timestamp: details.timestamp,
  });
  return createHash('sha256').update(canonical).digest('hex');
}

export function createMandate(
  txDetails: TransactionDetails,
  privateKeyPem: string,
  passphrase: string,
): PurchaseMandate {
  const txHash = hashTransactionDetails(txDetails);
  const data = Buffer.from(txHash);

  const privateKey = createPrivateKey({
    key: privateKeyPem,
    format: 'pem',
    type: 'pkcs8',
    passphrase,
  });

  const signature = sign(null, data, privateKey);

  const publicKey = createPublicKey(privateKey);
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;

  return {
    txId: txDetails.txId,
    txHash,
    signature: signature.toString('base64'),
    publicKey: publicKeyPem,
    timestamp: new Date().toISOString(),
  };
}

export function verifyMandate(mandate: PurchaseMandate, txDetails: TransactionDetails): boolean {
  try {
    const txHash = hashTransactionDetails(txDetails);
    if (txHash !== mandate.txHash) return false;

    const data = Buffer.from(txHash);
    const signature = Buffer.from(mandate.signature, 'base64');
    const publicKey = createPublicKey({
      key: mandate.publicKey,
      format: 'pem',
      type: 'spki',
    });

    return verify(null, data, publicKey, signature);
  } catch {
    return false;
  }
}
