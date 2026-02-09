# API Reference

## SDK (Programmatic — for Agents)

### `new AgentPay(options?)`

Initialize the AgentPay client.

```typescript
import { AgentPay } from '@useagentpay/sdk';

const ap = new AgentPay({
  home: '~/.agentpay',  // optional, defaults to ~/.agentpay
});
```

---

### Wallet

#### `ap.wallet.getBalance()`

Returns current wallet balance and limits.

```typescript
const wallet = await ap.wallet.getBalance();
// {
//   budget: 200.00,
//   balance: 170.01,
//   limitPerTx: 50.00,
//   spent: 29.99
// }
```

#### `ap.wallet.getHistory()`

Returns full transaction history.

```typescript
const history = await ap.wallet.getHistory();
// [{
//   id: 'tx_a1b2c3',
//   status: 'completed',
//   merchant: 'amazon.com',
//   amount: 29.99,
//   description: 'Wireless mouse',
//   timestamp: '2026-02-08T11:06:00Z',
//   receipt: { confirmationId: 'AMZ-12345' }
// }]
```

#### `ap.wallet.getLimits()`

Returns spending limits.

```typescript
const limits = await ap.wallet.getLimits();
// { budget: 200.00, limitPerTx: 50.00, remaining: 170.01 }
```

#### `ap.wallet.generateFundingQR(options?)`

Generates a QR code for the human to scan and set up their wallet.

```typescript
const qr = await ap.wallet.generateFundingQR({
  suggestedBudget: 100,
  message: 'Need budget for office supplies',
});
// { url: 'http://localhost:3000/setup?budget=100&msg=...', qrDataUrl: 'data:image/png;base64,...' }
```

---

### Transactions

#### `ap.transactions.propose(options)`

Propose a new purchase for human approval.

```typescript
const tx = await ap.transactions.propose({
  merchant: 'amazon.com',
  amount: 29.99,
  description: 'Wireless mouse for office setup',
  url: 'https://amazon.com/dp/B09ABC1234',  // merchant product URL
});
// {
//   id: 'tx_a1b2c3',
//   status: 'pending',
//   merchant: 'amazon.com',
//   amount: 29.99,
//   description: 'Wireless mouse for office setup',
//   createdAt: '2026-02-08T11:00:00Z'
// }
```

**Fails if:**
- Amount exceeds per-transaction limit
- Amount exceeds remaining balance
- Budget not set up

#### `ap.transactions.get(txId)`

Get transaction details and status.

```typescript
const tx = await ap.transactions.get('tx_a1b2c3');
// { id: 'tx_a1b2c3', status: 'approved', ... }
```

**Statuses:** `pending` | `approved` | `rejected` | `executing` | `completed` | `failed`

#### `ap.transactions.waitForApproval(txId, options?)`

Poll until the transaction is approved or rejected.

```typescript
const result = await ap.transactions.waitForApproval('tx_a1b2c3', {
  pollInterval: 5000,  // ms, default 5000
  timeout: 300000,     // ms, default 300000 (5 min)
});
// { status: 'approved' } or { status: 'rejected', reason: '...' }
```

**Throws:** `TimeoutError` if timeout is reached.

#### `ap.transactions.execute(txId)`

Execute an approved purchase via Browserbase.

```typescript
const receipt = await ap.transactions.execute('tx_a1b2c3');
// {
//   id: 'tx_a1b2c3',
//   status: 'completed',
//   merchant: 'amazon.com',
//   amount: 29.99,
//   confirmationId: 'AMZ-12345',
//   completedAt: '2026-02-08T11:06:00Z'
// }
```

**Fails if:**
- Transaction not in `approved` status
- Purchase mandate signature is invalid
- Insufficient balance
- Browserbase session fails
- Merchant checkout fails

#### `ap.transactions.getReceipt(txId)`

Get the receipt for a completed transaction.

```typescript
const receipt = await ap.transactions.getReceipt('tx_a1b2c3');
// { confirmationId: 'AMZ-12345', merchant: 'amazon.com', amount: 29.99, ... }
```

---

### Status

#### `ap.status()`

Get a full summary of the wallet state.

```typescript
const summary = await ap.status();
// {
//   balance: 170.01,
//   budget: 200.00,
//   limitPerTx: 50.00,
//   pending: [{ id: 'tx_d4e5f6', ... }],
//   recent: [{ id: 'tx_a1b2c3', ... }],
//   isSetup: true
// }
```

---

## CLI (Human-Facing)

### `agentpay setup`
Interactive setup: enter billing credentials, set passphrase, generate keypair.

### `agentpay budget --set <amount>`
Set total spending budget.

### `agentpay budget --limit-per-tx <amount>`
Set per-transaction spending limit.

### `agentpay pending`
List all pending purchase proposals.

### `agentpay approve <txId>`
Approve a pending purchase. Prompts for passphrase, signs a purchase mandate.

### `agentpay reject <txId> [--reason <reason>]`
Reject a pending purchase with optional reason.

### `agentpay status`
Show balance, limits, pending count, and recent transactions.

### `agentpay history`
Show full transaction history.

### `agentpay reset`
Delete all local AgentPay data (`~/.agentpay/`). Requires confirmation.

---

## MCP Skill

AgentPay can be registered as an MCP tool for any MCP-compatible agent.

```json
{
  "name": "agentpay",
  "description": "Securely purchase items on the web using a funded wallet",
  "tools": [
    {
      "name": "propose_purchase",
      "description": "Propose a purchase for human approval",
      "input": {
        "merchant": "string — merchant domain",
        "amount": "number — purchase amount in USD",
        "description": "string — what is being purchased",
        "url": "string — product URL on merchant site"
      }
    },
    {
      "name": "check_balance",
      "description": "Check wallet balance and spending limits",
      "input": {}
    },
    {
      "name": "get_transaction",
      "description": "Get status and details of a transaction",
      "input": {
        "txId": "string — transaction ID"
      }
    },
    {
      "name": "execute_purchase",
      "description": "Execute an approved purchase",
      "input": {
        "txId": "string — transaction ID (must be approved)"
      }
    }
  ]
}
```

---

## Error Codes

| Code | Description |
|---|---|
| `NOT_SETUP` | AgentPay hasn't been set up yet (`agentpay setup` needed) |
| `INSUFFICIENT_BALANCE` | Purchase amount exceeds remaining balance |
| `EXCEEDS_TX_LIMIT` | Purchase amount exceeds per-transaction limit |
| `NOT_APPROVED` | Transaction hasn't been approved by user |
| `INVALID_MANDATE` | Purchase mandate signature verification failed |
| `ALREADY_EXECUTED` | Transaction has already been executed |
| `CHECKOUT_FAILED` | Browserbase/Stagehand failed to complete merchant checkout |
| `TIMEOUT` | Operation timed out (e.g., waiting for approval) |
| `DECRYPT_FAILED` | Wrong passphrase or corrupted credentials file |
