import type { StepName } from './scoring.js';

export interface CheckoutScenario {
  name: string;
  url: string;
  tags: string[];
  timeoutMs: number;

  preSteps?: {
    instruction: string;
    variables?: Record<string, string>;
  }[];

  productSelection: string;
  cartPopulation: string;
  checkoutNavigation: string;

  formFill: {
    instruction: string;
    variables?: Record<string, string>;
  };

  confirmationExtract: string;

  /** Steps that are critical — failure stops the scenario */
  criticalSteps: StepName[];
}

export const scenarios: CheckoutScenario[] = [
  {
    name: 'SauceDemo - Simple',
    url: 'https://www.saucedemo.com',
    tags: ['login-required', 'simple', 'baseline'],
    timeoutMs: 90_000,
    preSteps: [
      {
        instruction:
          'Log in with username "standard_user" and password "secret_sauce". Type the username into the username field and the password into the password field, then click the Login button.',
      },
    ],
    productSelection:
      'Click on the "Sauce Labs Backpack" product to view its details.',
    cartPopulation: 'Click the "Add to cart" button.',
    checkoutNavigation:
      'Click the shopping cart icon in the top right, then click the "Checkout" button.',
    formFill: {
      instruction:
        'Fill in the checkout information form: First Name: "Test", Last Name: "User", Zip/Postal Code: "94105". Then click "Continue".',
    },
    confirmationExtract:
      'Click the "Finish" button to complete the order. Then extract the confirmation text — look for a message like "Thank you for your order" or an order number.',
    criticalSteps: ['init', 'navigate', 'pre-steps'],
  },

  {
    name: 'DemoBlaze - Modal',
    url: 'https://www.demoblaze.com',
    tags: ['modal-checkout', 'guest', 'simple'],
    timeoutMs: 90_000,
    productSelection:
      'Click on "Samsung galaxy s6" from the product list on the homepage.',
    cartPopulation: 'Click "Add to cart". Accept any alert/popup that appears.',
    checkoutNavigation:
      'Click the "Cart" link in the navigation bar at the top of the page.',
    formFill: {
      instruction:
        'Click the "Place Order" button. A modal dialog will appear. Fill in the form inside the modal: Name: "Test User", Country: "USA", City: "San Francisco", Credit card: "4111111111111111", Month: "12", Year: "2026". Then click the "Purchase" button inside the modal.',
    },
    confirmationExtract:
      'Extract the purchase confirmation. Look for a success message with an order ID or amount. There should be a sweet-alert popup with purchase details.',
    criticalSteps: ['init', 'navigate'],
  },

  {
    name: 'AutomationExercise - Multi-step',
    url: 'https://automationexercise.com',
    tags: ['multi-step', 'login-wall', 'ads'],
    timeoutMs: 180_000,
    productSelection:
      'Click on "Products" in the top navigation. Find the first product and click "Add to cart". If an overlay/ad appears, close it. In the modal that says "Added!", click "Continue Shopping".',
    cartPopulation:
      'Click the "Cart" button in the navigation to go to the cart page.',
    checkoutNavigation:
      'Click "Proceed To Checkout". If a login/register modal appears, click "Register / Login". Register a new account with name "TestBot", email "testbot_' +
      Date.now() +
      '@test.com", then click Signup. Fill the account form: password "Test1234!", First name "Test", Last name "Bot", Address "123 Main St", Country "United States", State "California", City "San Francisco", Zipcode "94105", Mobile Number "5551234567". Click "Create Account", then click "Continue". Then go to the Cart again and click "Proceed To Checkout".',
    formFill: {
      instruction:
        'Add a comment "Integration test order" in the comment textarea if visible. Then click "Place Order". On the payment page, fill: Name on Card: "Test Bot", Card Number: "4111111111111111", CVC: "123", Expiration Month: "12", Expiration Year: "2026". Click "Pay and Confirm Order".',
    },
    confirmationExtract:
      'Extract the order confirmation. Look for "Order Placed!" or a confirmation message on the page.',
    criticalSteps: ['init', 'navigate'],
  },

  {
    name: 'Saleor Demo - SPA',
    url: 'https://demo.saleor.io',
    tags: ['spa-dynamic', 'react', 'modern'],
    timeoutMs: 120_000,
    productSelection:
      'Click on any product from the homepage product grid — pick the first available product.',
    cartPopulation:
      'Select a variant if required (pick the first option), then click "Add to cart" or the cart/bag button.',
    checkoutNavigation:
      'Open the cart (click the cart/bag icon) and click "Checkout" or "Go to checkout".',
    formFill: {
      instruction:
        'Fill in the checkout form. For email, use "test@example.com". For shipping address: First Name "Test", Last Name "User", Street "123 Main St", City "New York", Country "United States", State/Province "New York", Postal Code "10001". Select a shipping method if prompted. For payment, if a test card form appears, use card: "4242424242424242", expiry "12/26", CVC "123". Proceed through each checkout step.',
    },
    confirmationExtract:
      'Extract the order confirmation. Look for an order number, "Thank you", or confirmation page content.',
    criticalSteps: ['init', 'navigate'],
  },

  {
    name: 'Hydrogen - Shopify',
    url: 'https://hydrogen.shop',
    tags: ['distracting-ui', 'shopify', 'express-pay'],
    timeoutMs: 120_000,
    productSelection:
      'Click on the first product visible on the homepage.',
    cartPopulation:
      'Select a variant/size if required (pick any available option), then click "Add to cart" or "Add to bag".',
    checkoutNavigation:
      'Open the cart (click the cart icon or "View cart") and click "Check out" or "Proceed to checkout".',
    formFill: {
      instruction:
        'IMPORTANT: Ignore any express payment buttons (Shop Pay, Google Pay, Apple Pay, PayPal). Use the standard checkout form below them. Fill in: Email "test@example.com", First Name "Test", Last Name "User", Address "123 Main St", City "San Francisco", State "California", ZIP "94105", Country "United States". Select a shipping method if prompted. For payment, use card number "1" in the bogus gateway test field, or if a real card form appears use "4242424242424242", expiry "12/26", CVC "123". Click "Pay now" or "Complete order".',
    },
    confirmationExtract:
      'Extract the order confirmation. Look for an order number, "Thank you for your purchase", or a confirmation page.',
    criticalSteps: ['init', 'navigate'],
  },

  {
    name: 'Stripe Payments Demo - Elements',
    url: 'https://stripe-payments-demo.appspot.com/',
    tags: ['stripe', 'elements', 'iframe', 'test-mode'],
    timeoutMs: 120_000,
    productSelection:
      'This is a single-page checkout. There should already be an order summary visible. No product selection needed — just confirm the page has loaded and shows an order form or payment section.',
    cartPopulation:
      'No cart step needed — the page is already a checkout form. Confirm the page shows payment method options or a card input area.',
    checkoutNavigation:
      'No navigation needed — you are already on the checkout page. Look for the card payment form. If there are payment method tabs (Card, Google Pay, etc.), make sure "Card" is selected.',
    formFill: {
      instruction:
        'Fill in the shipping/contact information if present: Name "Test User", Email "test@example.com", Address "123 Main St", City "San Francisco", State "CA", ZIP "94105". For the Stripe card payment form: enter card number "4242424242424242", expiry "12/28", CVC "123". The card fields may be inside a Stripe iframe — type into them directly. Then click "Pay" or "Submit" or the main payment button.',
    },
    confirmationExtract:
      'Extract the payment confirmation. Look for a success message, a payment status showing "succeeded", a receipt, or a confirmation page. The demo typically shows "Payment successful" or a green checkmark.',
    criticalSteps: ['init', 'navigate'],
  },
];
