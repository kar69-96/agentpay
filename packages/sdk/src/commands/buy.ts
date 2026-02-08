import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { promptPassphraseSafe, promptConfirm } from '../utils/prompt.js';
import { formatCurrency } from '../utils/display.js';
import { PurchaseExecutor } from '../executor/executor.js';
import { BudgetManager } from '../budget/budget.js';
import { TransactionManager } from '../transactions/manager.js';
import { AuditLogger } from '../audit/logger.js';
import { loadPrivateKey } from '../auth/keypair.js';
import { createMandate } from '../auth/mandate.js';
import { decrypt, loadVault } from '../vault/vault.js';
import { getCredentialsPath } from '../utils/paths.js';

// Load .env file if present (no external dependency)
function loadEnv(): void {
  try {
    const envPath = resolve(process.cwd(), '.env');
    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // No .env file — that's fine
  }
}

interface BuyOptions {
  merchant: string;
  amount?: string;
  description: string;
  url: string;
  pickup?: boolean;
}

export async function buyCommand(options: BuyOptions): Promise<void> {
  loadEnv();

  console.log('AgentPay Purchase');
  console.log('═════════════════\n');

  const executor = new PurchaseExecutor();
  const bm = new BudgetManager();
  const tm = new TransactionManager();
  const audit = new AuditLogger();
  const isTTY = process.stdin.isTTY;

  // Phase 1: Discover price (no credentials needed)
  let amount: number;
  let productName: string = options.description;

  if (options.amount) {
    // Amount provided upfront
    amount = parseFloat(options.amount);
    if (isNaN(amount) || amount <= 0) {
      console.error('Invalid amount.');
      process.exit(1);
    }
    console.log(`  Merchant:    ${options.merchant}`);
    console.log(`  Amount:      ${formatCurrency(amount)}`);
    console.log(`  Description: ${options.description}`);
    console.log(`  URL:         ${options.url}`);
    console.log();
  } else {
    // Phase 1: Navigate and discover price
    const pickupHint = options.pickup ? 'Select in-store pickup if available.' : '';
    const instructions = [pickupHint, options.description].filter(Boolean).join(' ');

    console.log('Opening browser to discover price...\n');
    try {
      const discovered = await executor.openAndDiscover(options.url, instructions || undefined);
      amount = discovered.price;
      productName = discovered.productName || options.description;
    } catch (err) {
      console.error(`Failed to load product page: ${err instanceof Error ? err.message : 'Unknown error'}`);
      await executor.close();
      process.exit(1);
    }

    if (amount <= 0) {
      console.error('Could not extract price from the page.');
      await executor.close();
      process.exit(1);
    }

    console.log(`  Product:     ${productName}`);
    console.log(`  Merchant:    ${options.merchant}`);
    console.log(`  Amount:      ${formatCurrency(amount)}`);
    console.log();
  }

  // Check balance
  try {
    bm.checkProposal(amount);
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Budget check failed.');
    await executor.close();
    process.exit(1);
  }

  // Phase 3: Collect passphrase (+ confirmation)
  // In TTY mode: confirm first, then prompt passphrase in terminal.
  // In non-TTY mode: browser page shows purchase details and acts as both
  // confirmation and passphrase entry — agent never sees the passphrase.
  let passphrase: string;
  if (isTTY) {
    const confirmed = await promptConfirm('Approve this purchase?');
    if (!confirmed) {
      console.log('Purchase cancelled.');
      await executor.close();
      process.exit(0);
    }
    passphrase = await promptPassphraseSafe();
  } else {
    passphrase = await promptPassphraseSafe({
      action: 'buy',
      merchant: options.merchant,
      amount,
      description: productName,
    });
    console.log('Passphrase received. Continuing...');
  }

  // Phase 4: Decrypt credentials
  const vault = loadVault(getCredentialsPath());
  const credentials = decrypt(vault, passphrase);

  // Phase 5: Propose transaction + sign mandate
  console.log('\nProposing transaction...');
  const tx = tm.propose({
    merchant: options.merchant,
    amount,
    description: productName,
    url: options.url,
  });
  audit.log('PROPOSE', { txId: tx.id, merchant: tx.merchant, amount: tx.amount, source: 'buy-command' });
  console.log(`  Transaction ${tx.id} created.`);

  // Approve (self-approve — human is running the CLI directly)
  const privateKeyPem = loadPrivateKey();
  const mandate = createMandate(
    { txId: tx.id, merchant: tx.merchant, amount: tx.amount, description: tx.description, timestamp: tx.createdAt },
    privateKeyPem,
    passphrase,
  );
  tm.approve(tx.id, mandate);
  audit.log('APPROVE', { txId: tx.id, source: 'buy-command', mandateSigned: true });
  console.log('  Approved and signed.\n');

  // Execute checkout
  console.log('Filling checkout...');
  tm.markExecuting(tx.id);
  audit.log('EXECUTE', { txId: tx.id, source: 'buy-command' });

  try {
    let result;
    if (!options.amount) {
      // Session already open from openAndDiscover — continue with fillAndComplete
      result = await executor.fillAndComplete(credentials);
    } else {
      // No session open yet — use single-shot execute
      result = await executor.execute(tx, credentials);
    }

    const receipt = {
      id: `rcpt_${tx.id.replace('tx_', '')}`,
      merchant: tx.merchant,
      amount: tx.amount,
      confirmationId: result.confirmationId ?? 'UNKNOWN',
      completedAt: new Date().toISOString(),
    };
    tm.markCompleted(tx.id, receipt);
    bm.deductBalance(tx.amount);
    audit.log('COMPLETE', { txId: tx.id, confirmationId: receipt.confirmationId, source: 'buy-command' });

    console.log(`\nPurchase complete!`);
    console.log(`  Confirmation: ${receipt.confirmationId}`);
    console.log(`  Amount:       ${formatCurrency(receipt.amount)}`);
  } catch (err) {
    tm.markFailed(tx.id, err instanceof Error ? err.message : 'Unknown error');
    audit.log('FAILED', { txId: tx.id, error: err instanceof Error ? err.message : 'Unknown', source: 'buy-command' });
    console.error(`\nCheckout failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    process.exit(1);
  } finally {
    await executor.close();
  }
}
