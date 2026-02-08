# User Flow

## Overview

AgentPay has two types of users with distinct flows:

1. **Human (end user)** — sets up credentials, funds wallet, approves purchases
2. **Agent (AI)** — proposes purchases, executes approved purchases, checks status

---

## Human Flow

### 1. Install

```bash
npm install -g agentpay
# or
curl -fsSL https://agentpay.dev/install.sh | sh
```

### 2. Setup Credentials

```bash
agentpay setup
```

Interactive prompt (all input stays local):

```
Welcome to AgentPay setup.

Your billing credentials will be encrypted and stored locally.
They will NEVER be sent to any server or exposed to any agent.

Enter a passphrase (used to encrypt your credentials): ********
Confirm passphrase: ********

Credit Card Number: 4111111111111111
Expiry (MM/YY): 12/27
CVV: 123

Full Name: Jane Smith
Billing Address: 123 Main St, San Francisco, CA 94102
Shipping Address (enter to use billing): 456 Oak Ave, San Francisco, CA 94103
Email: jane@example.com
Phone: +1 555-0123

Generating signing keypair...
Credentials encrypted and saved to ~/.agentpay/credentials.enc
Keypair saved to ~/.agentpay/keys/

Setup complete.
```

### 3. Set Budget

```bash
agentpay budget --set 200
agentpay budget --limit-per-tx 50
```

Output:
```
Budget set: $200.00
Per-transaction limit: $50.00
```

### 4. Share QR Code with Agent

Agent generates a QR code linking to a Next.js setup page (alternative to CLI setup). Human scans it on their phone, enters credentials there. Same local encryption — the web page is a UI wrapper.

### 5. Review Pending Purchases

When an agent proposes a purchase, the human reviews it:

```bash
agentpay pending
```

Output:
```
Pending Purchases:
─────────────────
TX_ID       MERCHANT        AMOUNT    DESCRIPTION
tx_a1b2c3   amazon.com      $29.99    Wireless mouse for office
tx_d4e5f6   netflix.com     $15.99    Monthly subscription renewal

2 pending purchases. Use 'agentpay approve <txId>' or 'agentpay reject <txId>'.
```

### 6. Approve or Reject

```bash
agentpay approve tx_a1b2c3
```

Output:
```
Enter passphrase to sign approval: ********

Approved: tx_a1b2c3
  Merchant: amazon.com
  Amount: $29.99
  Description: Wireless mouse for office

Purchase mandate signed. Agent can now execute this transaction.
```

### 7. Check Status

```bash
agentpay status
```

Output:
```
AgentPay Status
───────────────
Balance:            $170.01 / $200.00
Per-tx limit:       $50.00
Pending purchases:  1
Completed today:    1

Recent:
  [completed] tx_a1b2c3  amazon.com   $29.99  Wireless mouse
  [pending]   tx_d4e5f6  netflix.com  $15.99  Monthly subscription
```

---

## Agent Flow

### 1. Initialize SDK

```typescript
import { AgentPay } from 'agentpay';

const ap = new AgentPay();
```

No API key needed — the SDK reads from the local `~/.agentpay/` directory.

### 2. Check Balance

```typescript
const balance = await ap.wallet.getBalance();
// { balance: 170.01, budget: 200, limitPerTx: 50 }
```

### 3. Propose a Purchase

```typescript
const tx = await ap.transactions.propose({
  merchant: 'amazon.com',
  amount: 29.99,
  description: 'Wireless mouse for office setup',
  url: 'https://amazon.com/dp/B09ABC1234', // merchant product URL
});
// { id: 'tx_a1b2c3', status: 'pending', merchant: 'amazon.com', amount: 29.99 }
```

This creates a pending transaction. The agent must wait for the human to approve.

### 4. Wait for Approval

```typescript
// Poll until approved or rejected
const result = await ap.transactions.waitForApproval(tx.id, {
  pollInterval: 5000, // check every 5s
  timeout: 300000,    // give up after 5 min
});
// { status: 'approved', mandate: { signature: '...', publicKey: '...' } }
```

### 5. Execute the Purchase

```typescript
if (result.status === 'approved') {
  const receipt = await ap.transactions.execute(tx.id);
  // {
  //   id: 'tx_a1b2c3',
  //   status: 'completed',
  //   merchant: 'amazon.com',
  //   amount: 29.99,
  //   confirmationId: 'AMZ-12345',
  //   timestamp: '2026-02-08T...'
  // }
}
```

Under the hood, `execute()`:
1. Verifies the signed purchase mandate
2. Spins up a Browserbase session (recording disabled)
3. Stagehand navigates to the merchant URL
4. Fills checkout with `{{placeholders}}`
5. Atomic `page.evaluate()` swaps placeholders with real credentials and submits
6. Captures confirmation and returns receipt

### 6. Check Transaction History

```typescript
const history = await ap.wallet.getHistory();
// [{ id: 'tx_a1b2c3', status: 'completed', ... }, ...]
```

---

## QR Code Flow (Agent -> Human)

For scenarios where the agent needs the human to set up or fund their wallet:

```typescript
// Agent generates a QR code
const qr = await ap.wallet.generateFundingQR({
  suggestedBudget: 100,
  message: 'I need a budget to purchase office supplies for you.',
});
// Returns a QR code image (base64 or URL) that the agent shows to the human

// Human scans QR -> opens Next.js setup page -> enters credentials -> done
```

The QR code links to a locally-served or hosted Next.js page that walks the user through the setup flow with a visual UI instead of the CLI.

---

## Flow Diagram

```
HUMAN                              AGENT
──────                             ─────
  │                                  │
  │  agentpay setup                  │
  │  (enter credentials, budget)     │
  │                                  │
  │                                  │  ap.transactions.propose(...)
  │                                  │  → creates pending tx
  │                                  │
  │  agentpay pending                │
  │  (sees proposed purchase)        │
  │                                  │
  │  agentpay approve tx_abc         │
  │  (signs mandate w/ passphrase)   │
  │                                  │
  │                                  │  ap.transactions.execute(txId)
  │                                  │  → verifies mandate
  │                                  │  → Browserbase + Stagehand
  │                                  │  → placeholder injection
  │                                  │  → purchase complete
  │                                  │
  │  agentpay status                 │  ap.transactions.getReceipt(txId)
  │  (sees updated balance)          │  (gets confirmation)
```
