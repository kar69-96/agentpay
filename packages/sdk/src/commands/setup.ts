import { mkdirSync } from 'node:fs';
import { promptPassphrase, promptInput } from '../utils/prompt.js';
import { encrypt, saveVault } from '../vault/vault.js';
import { generateKeyPair, saveKeyPair } from '../auth/keypair.js';
import { BudgetManager } from '../budget/budget.js';
import { AuditLogger } from '../audit/logger.js';
import { getHomePath, getCredentialsPath, getKeysPath } from '../utils/paths.js';
import type { BillingCredentials } from '../vault/types.js';

export async function setupCommand(): Promise<void> {
  console.log('AgentPay Setup');
  console.log('══════════════\n');

  const home = getHomePath();
  mkdirSync(home, { recursive: true });

  // Passphrase
  const passphrase = await promptPassphrase('Choose a passphrase: ');
  const confirm = await promptPassphrase('Confirm passphrase: ');
  if (passphrase !== confirm) {
    console.error('Passphrases do not match.');
    process.exit(1);
  }

  // Card info
  console.log('\nBilling Information');
  console.log('───────────────────');
  const cardNumber = await promptInput('Card number: ');
  const cardExpiry = await promptInput('Expiry (MM/YY): ');
  const cardCvv = await promptInput('CVV: ');

  // Personal info
  console.log('\nPersonal Information');
  console.log('────────────────────');
  const name = await promptInput('Full name: ');
  const email = await promptInput('Email: ');
  const phone = await promptInput('Phone: ');

  // Billing address
  console.log('\nBilling Address');
  console.log('───────────────');
  const billingStreet = await promptInput('Street: ');
  const billingCity = await promptInput('City: ');
  const billingState = await promptInput('State: ');
  const billingZip = await promptInput('ZIP: ');
  const billingCountry = await promptInput('Country (e.g. US): ');

  // Shipping address
  console.log('\nShipping Address');
  console.log('────────────────');
  const sameAsBilling = await promptInput('Same as billing? (y/N): ');
  let shippingStreet: string, shippingCity: string, shippingState: string, shippingZip: string, shippingCountry: string;

  if (sameAsBilling.toLowerCase() === 'y' || sameAsBilling.toLowerCase() === 'yes') {
    shippingStreet = billingStreet;
    shippingCity = billingCity;
    shippingState = billingState;
    shippingZip = billingZip;
    shippingCountry = billingCountry;
  } else {
    shippingStreet = await promptInput('Street: ');
    shippingCity = await promptInput('City: ');
    shippingState = await promptInput('State: ');
    shippingZip = await promptInput('ZIP: ');
    shippingCountry = await promptInput('Country (e.g. US): ');
  }

  const credentials: BillingCredentials = {
    card: { number: cardNumber, expiry: cardExpiry, cvv: cardCvv },
    name,
    billingAddress: { street: billingStreet, city: billingCity, state: billingState, zip: billingZip, country: billingCountry },
    shippingAddress: { street: shippingStreet, city: shippingCity, state: shippingState, zip: shippingZip, country: shippingCountry },
    email,
    phone,
  };

  // Encrypt and save vault
  const vault = encrypt(credentials, passphrase);
  saveVault(vault, getCredentialsPath());
  console.log('\nCredentials encrypted and saved.');

  // Generate and save keypair
  const keys = generateKeyPair(passphrase);
  mkdirSync(getKeysPath(), { recursive: true });
  saveKeyPair(keys);
  console.log('Keypair generated.');

  // Initialize wallet
  const bm = new BudgetManager();
  bm.initWallet(0, 0);
  console.log('Wallet initialized.');

  // Audit
  const audit = new AuditLogger();
  audit.log('SETUP', { message: 'credentials encrypted, keypair generated, wallet initialized' });

  console.log('\nSetup complete! Next steps:');
  console.log('  agentpay budget --set 200      Set your spending budget');
  console.log('  agentpay budget --limit-per-tx 50  Set per-transaction limit');
}
