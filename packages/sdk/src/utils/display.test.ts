import { describe, it, expect } from 'vitest';
import { formatCurrency } from './display.js';

describe('formatCurrency', () => {
  it('formats a simple amount', () => {
    expect(formatCurrency(29.99)).toBe('$29.99');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('rounds to two decimal places', () => {
    expect(formatCurrency(10.999)).toBe('$11.00');
  });

  it('formats whole numbers with cents', () => {
    expect(formatCurrency(100)).toBe('$100.00');
  });
});
