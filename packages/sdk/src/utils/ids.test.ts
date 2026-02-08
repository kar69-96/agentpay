import { describe, it, expect } from 'vitest';
import { generateTxId } from './ids.js';

describe('generateTxId', () => {
  it('matches tx_ + 8 hex chars pattern', () => {
    const id = generateTxId();
    expect(id).toMatch(/^tx_[0-9a-f]{8}$/);
  });

  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateTxId()));
    expect(ids.size).toBe(100);
  });
});
