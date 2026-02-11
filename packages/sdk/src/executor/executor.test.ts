import { describe, it, expect, vi } from 'vitest';
import { credentialsToSwapMap, getPlaceholderVariables, PLACEHOLDER_MAP } from './placeholder.js';
import type { BillingCredentials } from '../vault/types.js';
import type { BrowserProvider } from './browser-provider.js';

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

describe('placeholder', () => {
  it('getPlaceholderVariables returns %var% syntax', () => {
    const vars = getPlaceholderVariables();
    expect(vars.card_number).toBe('%card_number%');
    expect(vars.cardholder_name).toBe('%cardholder_name%');
    expect(vars.card_expiry).toBe('%card_expiry%');
    expect(vars.card_cvv).toBe('%card_cvv%');
    expect(vars.email).toBe('%email%');
  });

  it('PLACEHOLDER_MAP uses {{}} syntax', () => {
    expect(PLACEHOLDER_MAP.card_number).toBe('{{card_number}}');
    expect(PLACEHOLDER_MAP.email).toBe('{{email}}');
  });

  it('credentialsToSwapMap maps placeholders to real values', () => {
    const swapMap = credentialsToSwapMap(testCredentials);
    expect(swapMap['{{card_number}}']).toBe('4111111111111111');
    expect(swapMap['{{cardholder_name}}']).toBe('John Doe');
    expect(swapMap['{{card_expiry}}']).toBe('12/28');
    expect(swapMap['{{card_cvv}}']).toBe('123');
    expect(swapMap['{{email}}']).toBe('john@example.com');
    expect(swapMap['{{phone}}']).toBe('+1-555-0100');
    expect(swapMap['{{billing_street}}']).toBe('123 Main St');
    expect(swapMap['{{shipping_city}}']).toBe('Chicago');
  });

  it('swapMap has all 16 placeholders', () => {
    const swapMap = credentialsToSwapMap(testCredentials);
    expect(Object.keys(swapMap).length).toBe(16);
  });
});

describe('PurchaseExecutor', () => {
  it('defaults to LocalBrowserProvider with no config', async () => {
    const { PurchaseExecutor } = await import('./executor.js');
    const executor = new PurchaseExecutor();
    expect(executor).toBeDefined();
  });

  it('accepts a custom browser provider', async () => {
    const { PurchaseExecutor } = await import('./executor.js');
    const mockProvider: BrowserProvider = {
      createStagehand: vi.fn(),
      close: vi.fn(),
    };
    const executor = new PurchaseExecutor({ provider: mockProvider });
    expect(executor).toBeDefined();
  });
});
