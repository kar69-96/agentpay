import { Stagehand } from '@browserbasehq/stagehand';
import type { BillingCredentials } from '../vault/types.js';
import type { Transaction } from '../transactions/types.js';
import type { CheckoutResult, ExecutorConfig } from './types.js';
import type { BrowserProvider } from './browser-provider.js';
import { CheckoutFailedError } from '../errors.js';
import { credentialsToSwapMap, getPlaceholderVariables } from './placeholder.js';
import { LocalBrowserProvider } from './providers/local-provider.js';

export interface DiscoverResult {
  price: number;
  productName: string;
}

export class PurchaseExecutor {
  private provider: BrowserProvider;
  private modelApiKey?: string;
  private stagehand: Stagehand | null = null;

  constructor(config?: ExecutorConfig) {
    this.provider = config?.provider ?? new LocalBrowserProvider();
    this.modelApiKey = config?.modelApiKey ?? process.env.ANTHROPIC_API_KEY;
  }

  private createStagehand(): Stagehand {
    return this.provider.createStagehand(this.modelApiKey);
  }

  /**
   * Phase 1: Open browser, navigate to URL, extract price and product info.
   * Keeps the session alive for fillAndComplete().
   */
  async openAndDiscover(url: string, instructions?: string): Promise<DiscoverResult> {
    this.stagehand = this.createStagehand();
    await this.stagehand.init();
    const page = this.stagehand.context.activePage()!;

    await page.goto(url);

    // Let Stagehand find the product and add to cart with optional extra instructions
    const addToCartInstructions = instructions
      ? `On this product page: ${instructions}. Then add the item to the cart.`
      : 'Add this product to the cart.';
    await this.stagehand.act(addToCartInstructions);

    // Extract price and product name
    const extracted = await this.stagehand.extract(
      'Extract the product name and the price (as a number without $ sign) from the page or cart. Return JSON: { "price": <number>, "productName": "<string>" }',
    ) as any;

    const price = parseFloat(extracted?.price ?? extracted?.extraction?.price ?? '0');
    const productName = extracted?.productName ?? extracted?.extraction?.productName ?? 'Unknown Product';

    return { price, productName };
  }

  /**
   * Phase 2: Proceed to checkout, fill forms, swap credentials, and submit.
   * Must be called after openAndDiscover().
   */
  async fillAndComplete(credentials: BillingCredentials): Promise<CheckoutResult> {
    if (!this.stagehand) {
      throw new CheckoutFailedError('No active session. Call openAndDiscover() first.');
    }

    try {
      // Proceed to checkout
      await this.stagehand.act('Proceed to checkout from the cart.');

      // Fill checkout form with placeholders
      const variables = getPlaceholderVariables();
      await this.stagehand.act(
        `Fill in the checkout form with these values:
          Name: ${variables.cardholder_name}
          Card Number: ${variables.card_number}
          Expiry: ${variables.card_expiry}
          CVV: ${variables.card_cvv}
          Email: ${variables.email}
          Phone: ${variables.phone}
          Billing Street: ${variables.billing_street}
          Billing City: ${variables.billing_city}
          Billing State: ${variables.billing_state}
          Billing ZIP: ${variables.billing_zip}
          Billing Country: ${variables.billing_country}
          Shipping Street: ${variables.shipping_street}
          Shipping City: ${variables.shipping_city}
          Shipping State: ${variables.shipping_state}
          Shipping ZIP: ${variables.shipping_zip}
          Shipping Country: ${variables.shipping_country}`,
        { variables },
      );

      // Atomic swap: replace placeholders with real credentials and submit
      const swapMap = credentialsToSwapMap(credentials);
      const page = this.stagehand.context.activePage()!;

      await page.evaluate((map: Record<string, string>) => {
        const inputs = document.querySelectorAll('input, textarea, select');
        for (const input of inputs) {
          const el = input as HTMLInputElement;
          for (const [placeholder, value] of Object.entries(map)) {
            if (el.value === placeholder) {
              el.value = value;
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
        }
        const submitBtn = document.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement | null;
        if (submitBtn) submitBtn.click();
      }, swapMap);

      // Wait for confirmation page
      await page.waitForTimeout(5000);

      // Try to extract confirmation
      const result = await this.stagehand.extract(
        'Extract the order confirmation number or ID from the page',
      );

      const confirmationId = (result as any)?.extraction;
      if (!confirmationId || confirmationId === 'null' || confirmationId === 'UNKNOWN') {
        throw new CheckoutFailedError('No order confirmation found. Checkout may not have completed.');
      }

      return {
        success: true,
        confirmationId,
      };
    } catch (err) {
      if (err instanceof CheckoutFailedError) throw err;
      const message = err instanceof Error ? err.message : 'Unknown checkout error';
      throw new CheckoutFailedError(message);
    }
  }

  /**
   * Convenience: single-shot execute (navigate + checkout in one call).
   * Used by AgentPay facade when amount is already known.
   */
  async execute(tx: Transaction, credentials: BillingCredentials): Promise<CheckoutResult> {
    this.stagehand = this.createStagehand();

    try {
      await this.stagehand.init();
      const page = this.stagehand.context.activePage()!;

      await page.goto(tx.url);

      const variables = getPlaceholderVariables();
      await this.stagehand.act(
        `Find the product and proceed to checkout. Fill in the checkout form with these values:
          Name: ${variables.cardholder_name}
          Card Number: ${variables.card_number}
          Expiry: ${variables.card_expiry}
          CVV: ${variables.card_cvv}
          Email: ${variables.email}
          Phone: ${variables.phone}
          Billing Street: ${variables.billing_street}
          Billing City: ${variables.billing_city}
          Billing State: ${variables.billing_state}
          Billing ZIP: ${variables.billing_zip}
          Billing Country: ${variables.billing_country}
          Shipping Street: ${variables.shipping_street}
          Shipping City: ${variables.shipping_city}
          Shipping State: ${variables.shipping_state}
          Shipping ZIP: ${variables.shipping_zip}
          Shipping Country: ${variables.shipping_country}`,
        { variables },
      );

      const swapMap = credentialsToSwapMap(credentials);
      await page.evaluate((map: Record<string, string>) => {
        const inputs = document.querySelectorAll('input, textarea, select');
        for (const input of inputs) {
          const el = input as HTMLInputElement;
          for (const [placeholder, value] of Object.entries(map)) {
            if (el.value === placeholder) {
              el.value = value;
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
        }
        const submitBtn = document.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement | null;
        if (submitBtn) submitBtn.click();
      }, swapMap);

      await page.waitForTimeout(5000);

      const result = await this.stagehand.extract(
        'Extract the order confirmation number or ID from the page',
      );

      const confirmationId = (result as any)?.extraction;
      if (!confirmationId || confirmationId === 'null' || confirmationId === 'UNKNOWN') {
        throw new CheckoutFailedError('No order confirmation found. Checkout may not have completed.');
      }

      return {
        success: true,
        confirmationId,
      };
    } catch (err) {
      if (err instanceof CheckoutFailedError) throw err;
      const message = err instanceof Error ? err.message : 'Unknown checkout error';
      throw new CheckoutFailedError(message);
    } finally {
      await this.close();
    }
  }

  async close(): Promise<void> {
    try {
      if (this.stagehand) {
        await this.stagehand.close();
        this.stagehand = null;
      }
    } catch {
      // Ignore cleanup errors
    } finally {
      await this.provider.close();
    }
  }
}
