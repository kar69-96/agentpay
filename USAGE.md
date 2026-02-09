# AgentPay Usage Guide

## Installation

```bash
npm install @useagentpay/sdk
```

## Quick Start

```bash
# 1. Set up credentials (human, one-time)
agentpay setup

# 2. Configure spending limits
agentpay budget --set 200 --limit-per-tx 50

# 3. Make a purchase
agentpay buy \
  --merchant "Amazon" \
  --description "USB-C cable" \
  --url "https://amazon.com/dp/B0XXXXXX" \
  --amount 12.99
```

---

## Commands

### `agentpay setup`

Interactive one-time setup. Prompts for passphrase, card details, billing/shipping address. Creates encrypted vault, Ed25519 keypair, and wallet at `~/.agentpay/`.

```bash
agentpay setup
```

### `agentpay budget`

View or configure spending limits.

```bash
agentpay budget                          # View current budget
agentpay budget --set 200               # Set total budget to $200
agentpay budget --limit-per-tx 50       # Set per-transaction limit to $50
agentpay budget --set 200 --limit-per-tx 50  # Set both
```

| Flag | Description |
|------|-------------|
| `--set <amount>` | Total spending budget |
| `--limit-per-tx <amount>` | Max amount per single purchase |

### `agentpay buy`

Propose, approve, and execute a purchase in one flow. Opens a Browserbase browser session to complete checkout.

```bash
agentpay buy \
  --merchant "Amazon" \
  --description "Wireless mouse" \
  --url "https://amazon.com/dp/B09ABC1234" \
  --amount 29.99
```

| Flag | Required | Description |
|------|----------|-------------|
| `--merchant <name>` | Yes | Merchant name (e.g., `amazon.com`) |
| `--description <desc>` | Yes | What is being purchased |
| `--url <url>` | Yes | Product or checkout URL |
| `--amount <amount>` | No | Price (auto-detected from page if omitted) |
| `--pickup` | No | Select in-store pickup if available |

**Flow:** Validates budget -> prompts for approval + passphrase -> signs mandate -> fills checkout -> completes purchase.

### `agentpay pending`

List all pending purchase proposals awaiting approval.

```bash
agentpay pending
```

Output columns: `TX_ID`, `MERCHANT`, `AMOUNT`, `DESCRIPTION`.

### `agentpay approve <txId>`

Approve a pending purchase. Prompts for passphrase to sign an Ed25519 mandate.

```bash
agentpay approve tx_abc123
```

### `agentpay reject <txId>`

Reject a pending purchase.

```bash
agentpay reject tx_abc123
agentpay reject tx_abc123 --reason "Too expensive"
```

| Flag | Description |
|------|-------------|
| `--reason <reason>` | Optional rejection reason |

### `agentpay status`

Show wallet balance, budget, limits, pending count, and recent transactions.

```bash
agentpay status
```

### `agentpay history`

Show full transaction history with status, merchant, amount, and date.

```bash
agentpay history
```

Status values: `[pending]`, `[approved]`, `[executing]`, `[completed]`, `[rejected]`, `[failed]`.

### `agentpay qr`

Display a QR code for web-based setup.

```bash
agentpay qr
agentpay qr --budget 100 --message "Setup for team bot"
```

| Flag | Description |
|------|-------------|
| `--budget <amount>` | Suggested budget amount |
| `--message <msg>` | Message shown on setup page |

### `agentpay dashboard`

Open a browser-based GUI for managing wallet and transactions.

```bash
agentpay dashboard
agentpay dashboard --port 8080
```

| Flag | Description |
|------|-------------|
| `--port <port>` | Server port (default: `3141`) |

### `agentpay reset`

Delete all AgentPay data. Requires typing `YES` to confirm.

```bash
agentpay reset
```

---

## SDK Usage (for agents)

Agents can use the SDK programmatically instead of the CLI.

```typescript
import { AgentPay } from '@useagentpay/sdk';

const ap = new AgentPay({
  passphrase: 'your-passphrase',
  executor: {
    apiKey: process.env.BROWSERBASE_API_KEY,
    projectId: process.env.BROWSERBASE_PROJECT_ID,
  },
});
```

### Propose a purchase

```typescript
const tx = ap.transactions.propose({
  merchant: 'amazon.com',
  amount: 29.99,
  description: 'Wireless mouse',
  url: 'https://amazon.com/dp/B09ABC1234',
});
// tx.id => "tx_abc123"
```

### Wait for human approval

```typescript
const result = await ap.transactions.waitForApproval(tx.id, {
  pollInterval: 2000,   // check every 2s
  timeout: 300000,       // 5 minute timeout
});
```

### Execute an approved purchase

```typescript
if (result.status === 'approved') {
  const receipt = await ap.transactions.execute(tx.id);
  console.log(receipt.confirmationId);
}
```

### Check wallet status

```typescript
const status = ap.status();
console.log(`Balance: $${status.balance}`);
console.log(`Pending: ${status.pending.length}`);
```

---

## Workflows

### Human-in-the-loop (agent proposes, human approves)

```
Agent                           Human
  │                               │
  ├─ propose purchase ───────────►│
  │                               ├─ agentpay pending
  │                               ├─ agentpay approve <txId>
  │◄── poll for approval ────────┤
  ├─ execute purchase             │
  ├─ log receipt                  │
  │                               ├─ agentpay status
```

### All-in-one (human runs buy directly)

```bash
agentpay buy --merchant "Amazon" --description "Cable" --url "..." --amount 12.99
# Prompts for approval + passphrase inline, then executes
```

---

## Transaction States

```
pending ──► approved ──► executing ──► completed
   │                         │
   └──► rejected             └──► failed
```

Terminal states: `completed`, `rejected`, `failed`.

---

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `BROWSERBASE_API_KEY` | Browserbase API key for browser sessions | Required for `buy` |
| `BROWSERBASE_PROJECT_ID` | Browserbase project ID | Required for `buy` |
| `AGENTPAY_HOME` | Override data directory | `~/.agentpay` |
| `AGENTPAY_WEB_URL` | Base URL for QR codes | `http://localhost:3000` |

---

## Data Directory (`~/.agentpay/`)

| File | Purpose |
|------|---------|
| `credentials.enc` | AES-256-GCM encrypted billing credentials |
| `keys/private.pem` | Ed25519 private key (passphrase-protected) |
| `keys/public.pem` | Ed25519 public key |
| `wallet.json` | Budget, balance, per-tx limit, spent total |
| `transactions.json` | All transactions |
| `audit.log` | Append-only log (`timestamp\tACTION\t{json}`) |

---

## MCP Server

AgentPay exposes its full lifecycle via MCP (Model Context Protocol), so any compatible host can use it.

### Install & Run

```bash
npx @useagentpay/mcp-server          # stdio (default)
npx @useagentpay/mcp-server --http   # HTTP transport
```

Or via the CLI:
```bash
agentpay mcp          # stdio
agentpay mcp --http   # HTTP
```

### Host Configuration

Add to your Claude Desktop, Cursor, or Claude Code config:
```json
{ "mcpServers": { "agentpay": { "command": "npx", "args": ["@useagentpay/mcp-server"] } } }
```

### Available Tools

| Tool | Description |
|------|-------------|
| `agentpay_status` | Check if setup, balance, budget, pending count |
| `agentpay_check_balance` | Current balance + limits |
| `agentpay_list_pending` | Pending transactions awaiting approval |
| `agentpay_propose_purchase` | Propose a new purchase |
| `agentpay_get_transaction` | Get transaction details by ID |
| `agentpay_wait_for_approval` | Long-poll until approved/rejected |
| `agentpay_execute_purchase` | Execute an approved purchase |
| `agentpay_get_receipt` | Get receipt for a completed purchase |

### Resources

| URI | Description |
|-----|-------------|
| `agentpay://wallet` | Wallet balance and limits |
| `agentpay://transactions/{txId}` | Transaction details |
| `agentpay://audit-log` | Last 50 audit log entries |

### Prompts

| Name | Description |
|------|-------------|
| `buy` | Step-by-step purchase flow |
| `budget-check` | Balance + pending summary |
| `purchase-status` | Recent transaction history |

### MCP Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `AGENTPAY_PASSPHRASE` | Passphrase for execute (env mode) | — |
| `AGENTPAY_PASSPHRASE_SERVER` | URL to fetch passphrase (server mode) | — |
| `MCP_TRANSPORT` | Set to `http` for HTTP transport | `stdio` |
| `MCP_HTTP_PORT` | HTTP port | `3100` |

---

## Error Codes

| Error | Meaning |
|-------|---------|
| `NotSetupError` | Run `agentpay setup` first |
| `DecryptError` | Wrong passphrase |
| `InsufficientBalanceError` | Purchase exceeds remaining budget |
| `ExceedsTxLimitError` | Purchase exceeds per-transaction limit |
| `NotApprovedError` | Transaction not yet approved |
| `InvalidMandateError` | Mandate signature missing or invalid |
| `AlreadyExecutedError` | Transaction already completed or failed |
| `CheckoutFailedError` | Browser checkout did not succeed |
| `TimeoutError` | Operation timed out |
