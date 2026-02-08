import type { BillingCredentials } from '../vault/types.js';

export const PLACEHOLDER_MAP = {
  card_number: '{{card_number}}',
  cardholder_name: '{{cardholder_name}}',
  card_expiry: '{{card_expiry}}',
  card_cvv: '{{card_cvv}}',
  billing_street: '{{billing_street}}',
  billing_city: '{{billing_city}}',
  billing_state: '{{billing_state}}',
  billing_zip: '{{billing_zip}}',
  billing_country: '{{billing_country}}',
  shipping_street: '{{shipping_street}}',
  shipping_city: '{{shipping_city}}',
  shipping_state: '{{shipping_state}}',
  shipping_zip: '{{shipping_zip}}',
  shipping_country: '{{shipping_country}}',
  email: '{{email}}',
  phone: '{{phone}}',
} as const;

export function getPlaceholderVariables(): Record<string, string> {
  // These are the %var% placeholders used with Stagehand act() variables
  // The AI never sees the real values — only these placeholders
  return {
    card_number: '%card_number%',
    cardholder_name: '%cardholder_name%',
    card_expiry: '%card_expiry%',
    card_cvv: '%card_cvv%',
    billing_street: '%billing_street%',
    billing_city: '%billing_city%',
    billing_state: '%billing_state%',
    billing_zip: '%billing_zip%',
    billing_country: '%billing_country%',
    shipping_street: '%shipping_street%',
    shipping_city: '%shipping_city%',
    shipping_state: '%shipping_state%',
    shipping_zip: '%shipping_zip%',
    shipping_country: '%shipping_country%',
    email: '%email%',
    phone: '%phone%',
  };
}

export function credentialsToSwapMap(creds: BillingCredentials): Record<string, string> {
  return {
    [PLACEHOLDER_MAP.card_number]: creds.card.number,
    [PLACEHOLDER_MAP.cardholder_name]: creds.name,
    [PLACEHOLDER_MAP.card_expiry]: creds.card.expiry,
    [PLACEHOLDER_MAP.card_cvv]: creds.card.cvv,
    [PLACEHOLDER_MAP.billing_street]: creds.billingAddress.street,
    [PLACEHOLDER_MAP.billing_city]: creds.billingAddress.city,
    [PLACEHOLDER_MAP.billing_state]: creds.billingAddress.state,
    [PLACEHOLDER_MAP.billing_zip]: creds.billingAddress.zip,
    [PLACEHOLDER_MAP.billing_country]: creds.billingAddress.country,
    [PLACEHOLDER_MAP.shipping_street]: creds.shippingAddress.street,
    [PLACEHOLDER_MAP.shipping_city]: creds.shippingAddress.city,
    [PLACEHOLDER_MAP.shipping_state]: creds.shippingAddress.state,
    [PLACEHOLDER_MAP.shipping_zip]: creds.shippingAddress.zip,
    [PLACEHOLDER_MAP.shipping_country]: creds.shippingAddress.country,
    [PLACEHOLDER_MAP.email]: creds.email,
    [PLACEHOLDER_MAP.phone]: creds.phone,
  };
}

/**
 * Atomically swap placeholders with real credentials in the DOM and submit.
 * This is called via page.evaluate() — credentials exist in the DOM only for milliseconds.
 */
export function getAtomicSwapScript(): string {
  return `
    (swapMap) => {
      const inputs = document.querySelectorAll('input, textarea, select');
      for (const input of inputs) {
        const el = input;
        for (const [placeholder, value] of Object.entries(swapMap)) {
          if (el.value === placeholder) {
            el.value = value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }
      // Submit the form
      const submitBtn = document.querySelector('button[type="submit"], input[type="submit"]');
      if (submitBtn) submitBtn.click();
    }
  `;
}
