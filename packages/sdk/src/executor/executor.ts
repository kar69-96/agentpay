import { Agent } from 'browser-use';
import type { BillingCredentials } from '../vault/types.js';
import type { Transaction } from '../transactions/types.js';
import type { CheckoutResult, ExecutorConfig } from './types.js';
import type { BrowserProvider } from './browser-provider.js';
import { CheckoutFailedError } from '../errors.js';
import { LocalBrowserProvider } from './providers/local-provider.js';

export interface DiscoverResult {
  price: number;
  productName: string;
}

export class PurchaseExecutor {
  private provider: BrowserProvider;
  private modelApiKey?: string;
  private modelName?: string;
  private headless: boolean;
  private maxSteps: number;
  private agent: Agent | null = null;

  constructor(config?: ExecutorConfig) {
    this.provider = config?.provider ?? new LocalBrowserProvider();
    this.modelApiKey = config?.modelApiKey;
    this.modelName = config?.modelName;
    this.headless = config?.headless ?? true;
    this.maxSteps = config?.maxSteps ?? 30;
  }

  /**
   * Build a sensitive_data map from billing credentials.
   * browser-use masks these from the LLM but fills them into form fields directly.
   */
  private buildSensitiveData(creds: BillingCredentials): Record<string, string> {
    return {
      x_card_number: creds.card.number,
      x_card_expiry: creds.card.expiry,
      x_card_cvv: creds.card.cvv,
      x_cardholder_name: creds.name,
      x_email: creds.email,
      x_phone: creds.phone,
      x_billing_street: creds.billingAddress.street,
      x_billing_city: creds.billingAddress.city,
      x_billing_state: creds.billingAddress.state,
      x_billing_zip: creds.billingAddress.zip,
      x_billing_country: creds.billingAddress.country,
      x_shipping_street: creds.shippingAddress.street,
      x_shipping_city: creds.shippingAddress.city,
      x_shipping_state: creds.shippingAddress.state,
      x_shipping_zip: creds.shippingAddress.zip,
      x_shipping_country: creds.shippingAddress.country,
    };
  }

  /**
   * Build the checkout task prompt for the agent.
   */
  private buildCheckoutTask(tx: Transaction, _creds: BillingCredentials): string {
    return `Complete a purchase on ${tx.url} for $${tx.amount}.

Steps:
1. Navigate to ${tx.url}
2. Find the product/item and add it to cart (or initiate the purchase/donation flow)
3. Proceed to checkout
4. Fill in the checkout form using the secret variables:
   - Name: x_cardholder_name
   - Email: x_email
   - Phone: x_phone
   - Billing address: x_billing_street, x_billing_city, x_billing_state, x_billing_zip, x_billing_country
   - Shipping address: x_shipping_street, x_shipping_city, x_shipping_state, x_shipping_zip, x_shipping_country
   - Card number: x_card_number
   - Card expiry: x_card_expiry
   - Card CVV: x_card_cvv
5. Submit the payment
6. Wait for and verify the confirmation page

Important:
- Use the secret variables (prefixed with x_) for all sensitive fields — they will be automatically filled with the real values.
- If there is an amount selector, set it to $${tx.amount}.
- If there is a one-time/monthly toggle, select one-time.
- Card fields may be in Stripe iframes — try to type into them directly.
- Do NOT close the browser — just report when the purchase is confirmed.`;
  }

  /**
   * Phase 1: Open browser, navigate to URL, extract price and product info.
   * Keeps the session alive for fillAndComplete().
   */
  async openAndDiscover(url: string, instructions?: string): Promise<DiscoverResult> {
    const llm = this.provider.createLLM(this.modelApiKey, this.modelName);
    const session = this.provider.createSession(this.headless);

    const task = instructions
      ? `Go to ${url}. ${instructions}. Then add the item to the cart. Extract the product name and price.`
      : `Go to ${url}. Add the first available product to the cart. Extract the product name and price.`;

    this.agent = new Agent({
      task,
      llm,
      browser_session: session,
      use_vision: true,
      max_actions_per_step: 4,
    });

    const history = await this.agent.run(15);
    const result = history.final_result();

    // Try to parse price and product name from result
    let price = 0;
    let productName = 'Unknown Product';

    if (result) {
      const priceMatch = result.match(/\$?([\d.]+)/);
      if (priceMatch) price = parseFloat(priceMatch[1]);
      productName = result.replace(/\$[\d.]+/, '').trim() || 'Unknown Product';
    }

    return { price, productName };
  }

  /**
   * Phase 2: Proceed to checkout, fill forms, and submit.
   * Must be called after openAndDiscover().
   */
  async fillAndComplete(credentials: BillingCredentials): Promise<CheckoutResult> {
    if (!this.agent) {
      throw new CheckoutFailedError('No active session. Call openAndDiscover() first.');
    }

    try {
      const sensitiveData = this.buildSensitiveData(credentials);

      this.agent.addNewTask(
        `Now proceed to checkout and complete the purchase.
        Fill in the checkout form using the secret variables:
        - Name: x_cardholder_name
        - Email: x_email
        - Card number: x_card_number, Expiry: x_card_expiry, CVV: x_card_cvv
        - Address: x_billing_street, x_billing_city, x_billing_state, x_billing_zip, x_billing_country
        Submit the payment and wait for confirmation.`
      );
      this.agent.sensitive_data = { '*': sensitiveData };

      const history = await this.agent.run(this.maxSteps);
      const success = history.is_successful();
      const result = history.final_result();

      if (success) {
        return { success: true, confirmationId: result || 'completed' };
      }

      throw new CheckoutFailedError(result || 'Checkout did not complete successfully.');
    } catch (err) {
      if (err instanceof CheckoutFailedError) throw err;
      const message = err instanceof Error ? err.message : 'Unknown checkout error';
      throw new CheckoutFailedError(message);
    }
  }

  /**
   * Single-shot execute: navigate, fill, and complete checkout in one agent run.
   */
  async execute(tx: Transaction, credentials: BillingCredentials): Promise<CheckoutResult> {
    const llm = this.provider.createLLM(this.modelApiKey, this.modelName);
    const session = this.provider.createSession(this.headless);
    const sensitiveData = this.buildSensitiveData(credentials);

    this.agent = new Agent({
      task: this.buildCheckoutTask(tx, credentials),
      llm,
      browser_session: session,
      sensitive_data: { '*': sensitiveData },
      use_vision: true,
      max_actions_per_step: 4,
      max_failures: 5,
    });

    try {
      const history = await this.agent.run(this.maxSteps);
      const success = history.is_successful();
      const result = history.final_result();

      if (success) {
        return { success: true, confirmationId: result || 'completed' };
      }

      throw new CheckoutFailedError(result || 'Could not confirm payment completion.');
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
      if (this.agent) {
        await this.agent.close();
        this.agent = null;
      }
    } catch {
      // Ignore cleanup errors
    } finally {
      await this.provider.close();
    }
  }
}
