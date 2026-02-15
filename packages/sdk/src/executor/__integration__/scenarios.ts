export interface CheckoutScenario {
  name: string;
  url: string;
  tags: string[];
  timeoutMs: number;
  /** The full task description for the browser-use Agent */
  task: string;
  /** Max steps for the agent loop */
  maxSteps: number;
  /** Keywords that indicate success in the final result */
  successIndicators: string[];
}

export const scenarios: CheckoutScenario[] = [
  {
    name: 'SauceDemo - Simple',
    url: 'https://www.saucedemo.com',
    tags: ['login-required', 'simple', 'baseline'],
    timeoutMs: 240_000,
    maxSteps: 20,
    task: `Go to https://www.saucedemo.com.
Log in with username "standard_user" and password "secret_sauce".
Click on "Sauce Labs Backpack" to view it.
Click "Add to cart".
Click the shopping cart icon, then click "Checkout".
Fill in First Name: "Test", Last Name: "User", Zip Code: "94105".
Click "Continue".
Click "Finish".
Report the confirmation message shown on the page.`,
    successIndicators: ['thank you', 'order', 'complete', 'dispatched'],
  },

  {
    name: 'DemoBlaze - Modal',
    url: 'https://www.demoblaze.com',
    tags: ['modal-checkout', 'guest', 'simple'],
    timeoutMs: 300_000,
    maxSteps: 20,
    task: `Go to https://www.demoblaze.com.
Click on "Samsung galaxy s6" from the product list.
Click "Add to cart". Accept any alert/popup that appears.
Click the "Cart" link in the top navigation.
Click "Place Order".
In the modal dialog, fill: Name "Test User", Country "USA", City "San Francisco", Credit card "4111111111111111", Month "12", Year "2026".
Click "Purchase".
Report the confirmation message and any order ID shown.`,
    successIndicators: ['purchase', 'confirm', 'success', 'order', 'id'],
  },

  {
    name: 'AutomationExercise - Multi-step',
    url: 'https://automationexercise.com',
    tags: ['multi-step', 'login-wall', 'ads'],
    timeoutMs: 600_000,
    maxSteps: 40,
    task: `Go to https://automationexercise.com.
Click "Products" in the top navigation.
Find the first product and click "Add to cart". If an overlay/ad appears, close it.
In the "Added!" modal, click "Continue Shopping".
Click the "Cart" button in the navigation.
Click "Proceed To Checkout".
If a login/register modal appears, click "Register / Login".
Register with name "TestBot", email "testbot_${Date.now()}@test.com", then click Signup.
Fill: password "Test1234!", First name "Test", Last name "Bot", Address "123 Main St", Country "United States", State "California", City "San Francisco", Zipcode "94105", Mobile "5551234567".
Click "Create Account", then "Continue".
Go to Cart, click "Proceed To Checkout".
Click "Place Order".
Fill payment: Name on Card "Test Bot", Card Number "4111111111111111", CVC "123", Month "12", Year "2026".
Click "Pay and Confirm Order".
Report the order confirmation message.`,
    successIndicators: ['order placed', 'confirm', 'congratulations'],
  },

  {
    name: 'Saleor Demo - SPA',
    url: 'https://demo.saleor.io',
    tags: ['spa-dynamic', 'react', 'modern'],
    timeoutMs: 540_000,
    maxSteps: 30,
    task: `Go to https://demo.saleor.io.
Click on the first product from the homepage.
Select a variant if needed, then click "Add to cart" or the bag button.
Open the cart and click "Checkout" or "Go to checkout".
Fill the checkout form: Email "test@example.com", First Name "Test", Last Name "User", Street "123 Main St", City "New York", Country "United States", State "New York", Postal Code "10001".
Select a shipping method if prompted.
If a card form appears, use: card "4242424242424242", expiry "12/26", CVC "123".
Proceed through each step.
Report any order confirmation, thank you message, or error.`,
    successIndicators: ['thank you', 'order', 'confirm', 'placed'],
  },

  {
    name: 'Hydrogen - Shopify',
    url: 'https://hydrogen.shop',
    tags: ['distracting-ui', 'shopify', 'express-pay'],
    timeoutMs: 660_000,
    maxSteps: 35,
    task: `Go to https://hydrogen.shop.
Click on the first product on the homepage.
Select a variant/size if needed, then click "Add to cart".
Open the cart and click "Check out" or "Proceed to checkout".
Ignore any "Shop Pay", "Google Pay", or "PayPal" express buttons.
Fill the email field with "test@example.com".
Fill shipping: First Name "Test", Last Name "User", Address "123 Main St", City "San Francisco", Country "United States", State "California", ZIP "94105".
Click "Continue to shipping" or "Continue to payment" if shown.
Report what you see after filling the form — any confirmation, shipping options, or payment page.`,
    successIndicators: ['shipping', 'payment', 'continue', 'order', 'thank'],
  },

  {
    name: 'Stripe Payments Demo - Elements',
    url: 'https://stripe-payments-demo.appspot.com/',
    tags: ['stripe', 'elements', 'iframe', 'test-mode'],
    timeoutMs: 300_000,
    maxSteps: 20,
    task: `Go to https://stripe-payments-demo.appspot.com/.
This is a checkout page. Fill in: Name "Test User", Email "test@example.com", Address "123 Main St", City "San Francisco", State "CA", ZIP "94105".
Make sure "Card" payment method is selected.
Fill card: number "4242424242424242", expiry "12/28", CVC "123". The card fields may be in a Stripe iframe.
Click "Pay" or the main payment button.
Report whether the payment succeeded — look for a success message or green checkmark.`,
    successIndicators: ['success', 'payment', 'succeeded', 'confirmed', 'thank'],
  },
];
