import { randomBytes } from 'node:crypto';

export function generateTxId(): string {
  return `tx_${randomBytes(4).toString('hex')}`;
}
