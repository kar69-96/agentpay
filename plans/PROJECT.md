# AgentPay — Secure Payments Infrastructure for AI Agents

> **It's not AI for your payments. It's payments for your AI.**

AgentPay is an open-source, **local-first** payments infrastructure that gives AI agents the ability to securely purchase things on the web — without ever touching a user's credit card. Users store credentials locally on their own machine, set budgets, and approve or reject purchases. Agents spend within those limits, executing transactions via Browserbase. No servers, no databases, no PCI scope.

Distributed as a downloadable skill via `npm` or `curl`. Meant to be the open standard for agent commerce.

---

## Core Concept

```
User (human)                         Agent (AI)
─────────────                        ──────────
  │                                      │
  │  1. Fund wallet (credit card / QR)   │
  │──────────────────────────────────>   │
  │                                      │
  │  2. Agent proposes a purchase        │
  │   <──────────────────────────────────│
  │                                      │
  │  3. User approves / rejects          │
  │──────────────────────────────────>   │
  │                                      │
  │  4. Agent executes purchase          │
  │      (via Browserbase, never         │
  │       sees credit card)              │
  │                                      │
  │  5. Receipt & confirmation           │
  │   <──────────────────────────────────│
```

The agent never has access to credit card or billing details. It only has access to the budget the user has designated. All credentials stay on the user's machine.

---

## User Flow

### 1. Setup & Credential Storage (Local-Only)
- User runs `agentpay setup` via CLI
- User enters **billing credentials** into a local prompt (never transmitted anywhere):
  - Credit card details (number, expiry, CVV)
  - Full name
  - Billing address
  - Shipping address (can differ from billing)
  - Email and phone number
- Credentials are **encrypted with a user-provided passphrase** (AES-256-GCM) and stored locally at `~/.agentpay/credentials.enc`
- Credentials **never leave the user's machine** except encrypted in transit to a Browserbase session at checkout time
- User sets a **spending budget** (e.g., $200 total) — stored locally in `~/.agentpay/wallet.json`
- No server, no cloud, no third-party storage

### 2. Agent Proposes a Transaction
- Agent identifies something to purchase (e.g., a gift card, a SaaS subscription, a product)
- Agent calls `agentpay.propose({ merchant, amount, description })` via the SDK
- A pending transaction is created and surfaced to the user

### 3. User Approves or Rejects
- User receives notification of the proposed purchase (via API polling, webhook, or UI)
- User reviews: merchant, amount, description
- User responds: **approve** or **reject**

### 4. Agent Executes the Purchase (Placeholder Injection Pattern)
- On approval, agent calls `agentpay.execute(transactionId)`
- AgentPay spins up a **Browserbase session** with **recording disabled**
- Stagehand navigates to the merchant checkout page
- Stagehand fills all form fields with **masked placeholders**:
  - Card number → `{{card_number}}`
  - Name → `{{cardholder_name}}`
  - Billing address → `{{billing_address}}`
  - etc.
- **At the moment of submission**, a single atomic `page.evaluate()` call:
  1. Decrypts credentials from the local vault (passphrase cached in memory)
  2. Replaces all `{{placeholders}}` with real values in the DOM
  3. Immediately submits the form
- Real credentials exist in the DOM for **milliseconds** — not visible to any observer, recording, or live session view
- The agent's code path **never has credentials in scope** — they flow directly from encrypted vault → Browserbase DOM → form submit
- Purchase is completed, confirmation is captured

### 5. Receipt & Confirmation
- Transaction is recorded with: merchant, amount, timestamp, status, confirmation details
- Wallet balance is updated
- Receipt is returned to the agent and available via API

---

## Architecture

### Design Principles
- **Local-first, stateless** — no servers, no databases. All data (credentials, wallet, transactions) stored on the user's machine
- **Zero-knowledge credential handling** — agent code never sees card or billing details; they flow from local encrypted vault → Browserbase DOM, bypassing the agent entirely
- **Placeholder injection** — checkout forms are filled with `{{placeholders}}` visually; real values are swapped in milliseconds before submission, invisible to observers or recordings
- **Wallet = budget tracker** — not held funds; just a local counter that decrements on purchases. The merchant charges the card directly
- **Approval-gated execution** — humans approve every transaction
- **Open source** — fully auditable, forkable, no vendor lock-in

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                      AgentPay SDK (local)                       │
│              (npm package / MCP skill / curl)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────┐   ┌──────────────┐   ┌───────────────────────┐  │
│   │  Budget   │   │  Transaction │   │   Purchase Executor   │  │
│   │  Tracker  │   │   Manager    │   │ (Stagehand+Browserbase│  │
│   └──────────┘   └──────────────┘   └───────────────────────┘  │
│        │                │                      │                │
│        ▼                ▼                      ▼                │
│   ┌──────────┐   ┌──────────────┐   ┌───────────────────────┐  │
│   │  Local    │   │   Approval   │   │  Local Encrypted      │  │
│   │  Wallet   │   │   Gate       │   │  Credentials Vault    │  │
│   │  (.json)  │   │              │   │  (~/.agentpay/)       │  │
│   └──────────┘   └──────────────┘   └───────────────────────┘  │
│                                                                 │
│              All data stored on user's machine                  │
└─────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

| Component | Responsibility |
|---|---|
| **Budget Tracker** | Local JSON file tracking balance, spending limits, remaining allowance |
| **Transaction Manager** | Propose, approve, reject, execute, track transaction lifecycle (local JSON) |
| **Approval Gate** | Surface proposed transactions to user, handle approve/reject via CLI |
| **Purchase Executor** | Spin up Browserbase + Stagehand sessions, navigate merchant pages, fill checkout with placeholders, execute atomic credential swap + submit |
| **Local Credentials Vault** | AES-256-GCM encrypted file (`~/.agentpay/credentials.enc`) storing card, name, billing/shipping address, email, phone — decrypted only at submission time, never exposed to agent |

---

## Security Model

### Three-Layer Credential Protection

**Layer 1: Local Encrypted Vault**
- All billing credentials stored in `~/.agentpay/credentials.enc`
- Encrypted with AES-256-GCM using a user-provided passphrase
- Never transmitted to any server or API — decrypted only in memory at checkout time

**Layer 2: Browserbase Recording Disabled**
- Sessions created with recording disabled — no playback exists
- No screenshots, no session replays, no visual logs of the checkout process

**Layer 3: Placeholder Injection Pattern**
- Stagehand fills checkout forms with `{{card_number}}`, `{{billing_address}}`, etc.
- Any observer (live view, screenshot, DOM inspector) sees only placeholders
- Real values are swapped in via a single atomic `page.evaluate()` call milliseconds before form submission
- Credentials exist in the DOM for the instant of submission — not human-readable

```
Credential flow:

  ~/.agentpay/credentials.enc
            │
            ▼  (user passphrase decrypts in memory)
      Raw credentials
            │
            ▼  (passed as variable to page.evaluate, HTTPS)
      Browserbase session DOM
            │
            ▼  (replaces {{placeholders}}, submits form)
      Merchant receives payment
            │
            ▼  (only receipt returned)
      Agent sees: "purchase complete"
```

### Authorization: Cryptographic Proof of Human Intent (Inspired by [Google AP2](https://github.com/google-agentic-commerce/AP2))

The core problem: how do you prove a **real human** approved a specific transaction, not just that an agent claims they did?

**Purchase Mandate** — every approved transaction generates a cryptographically signed mandate:

```
When user runs `agentpay approve <txId>`:

1. User's local keypair (generated at setup, stored in ~/.agentpay/keys/)
2. Transaction details are hashed: { merchant, amount, description, timestamp }
3. User signs the hash with their private key (requires passphrase)
4. Signed mandate = { txDetails, signature, publicKey }
```

This mandate is:
- **Non-repudiable** — only the user's private key could have produced it
- **Tamper-evident** — any change to transaction details invalidates the signature
- **Verifiable** — anyone with the public key can confirm the user approved this exact transaction
- **Tied to specific details** — approving "$29.99 at Amazon for a mouse" cannot be reused for "$500 at Best Buy"

**What this prevents:**
- Agent forging approvals (can't sign without user's passphrase)
- Replay attacks (each mandate is tied to a unique transaction ID + timestamp)
- Tampering (changing amount/merchant invalidates the signature)

**Verification flow:**
```
Agent calls execute(txId)
        │
        ▼
AgentPay checks: does this txId have a valid signed mandate?
        │
        ▼  (verify signature against user's public key)
  Valid? → proceed with Browserbase checkout
  Invalid? → reject execution
```

### Budget Security
- Budget is a local JSON counter — not held funds
- Spending limits enforced locally: per-transaction and total budget caps
- All transactions require user approval via CLI
- Agent cannot modify budget — only the user can via `agentpay setup`

### Data Security
- All credentials encrypted at rest (AES-256-GCM)
- Encrypted in transit to Browserbase (HTTPS/TLS)
- No server, no cloud storage, no third-party data sharing
- Local audit log for every action (propose, approve, reject, execute)
- Fully open source — security model is auditable by anyone

---

## SDK API

Everything — budget, balance, transaction history, pending approvals — is accessible via the SDK (programmatic) and CLI (human).

### Programmatic API (for agents)
```typescript
agentpay.wallet.getBalance()              // Current balance & budget remaining
agentpay.wallet.getHistory()              // Full transaction history
agentpay.wallet.getLimits()               // Per-tx and total budget limits

agentpay.transactions.propose({...})      // Propose a new purchase
agentpay.transactions.get(txId)           // Get transaction status & details
agentpay.transactions.execute(txId)       // Execute an approved purchase
agentpay.transactions.getReceipt(txId)    // Get purchase receipt

agentpay.status()                         // Summary: balance, pending, recent
```

### CLI Commands (for humans)
```bash
agentpay setup                            # Enter & encrypt billing credentials
agentpay budget --set 200                 # Set spending budget
agentpay budget --limit-per-tx 50         # Set per-transaction limit
agentpay pending                          # View pending purchase proposals
agentpay approve <txId>                   # Approve a pending purchase
agentpay reject <txId>                    # Reject a pending purchase
agentpay history                          # Full transaction history
agentpay status                           # Balance, limits, pending, recent
```

---

## SDK / Developer Experience

### Installation
```bash
# npm
npm install agentpay

# curl (single binary)
curl -fsSL https://agentpay.dev/install.sh | sh
```

### Agent Usage (TypeScript)
```typescript
import { AgentPay } from 'agentpay';

const ap = new AgentPay({ apiKey: process.env.AGENTPAY_API_KEY });

// Check wallet balance
const wallet = await ap.wallets.get('wallet_abc123');
console.log(`Balance: $${wallet.balance}`);

// Propose a purchase
const tx = await ap.transactions.propose({
  walletId: 'wallet_abc123',
  merchant: 'amazon.com',
  amount: 29.99,
  description: 'Wireless mouse for office setup',
});

// Wait for user approval
const approved = await ap.transactions.waitForApproval(tx.id);

if (approved) {
  // Execute the purchase (Browserbase handles it securely)
  const receipt = await ap.transactions.execute(tx.id);
  console.log(`Purchase complete: ${receipt.confirmationId}`);
}
```

### MCP Skill
```json
{
  "name": "agentpay",
  "description": "Securely purchase items on the web using a funded wallet",
  "tools": ["propose_purchase", "check_balance", "get_transaction_status"]
}
```

### User Operations (CLI)
```bash
# Initial setup — enter & encrypt billing credentials
agentpay setup

# Set spending budget
agentpay budget --set 200

# View pending approvals
agentpay pending

# Approve a transaction
agentpay approve tx_def456

# Check balance & history
agentpay status
```

---

## Distribution Model

| Channel | Description |
|---|---|
| **npm** | `npm install agentpay` — TypeScript/Node SDK |
| **Python** | `pip install agentpay` — Python SDK (future) |
| **curl** | One-liner install script for CLI |
| **MCP** | Model Context Protocol skill — plug into any MCP-compatible agent |

No server to host. Everything runs locally.

---

## What Makes This Different

| Existing Approach | AgentPay |
|---|---|
| Agent has access to credit card details | Agent **never** sees card details |
| Payments hardcoded per merchant | Works on **any merchant page** via Browserbase |
| No human oversight | **Approval-gated**: user approves every purchase |
| Proprietary, closed-source | **Fully open source**, self-hostable |
| Complex integration | `npm install agentpay` — one line |
| No budget controls | **Wallet with spending limits**, daily caps, per-tx limits |
| No transaction visibility | **Full API**: balance, history, budgets, receipts |

---

## Open Questions & Future Considerations

- **Rate limiting**: Protect against runaway agents submitting excessive proposals (local counter-based).
- **Multi-merchant reliability**: Stagehand handles diverse checkouts well but won't be 100% on day one — needs a growing list of tested merchants.
- **Mobile-first setup**: QR code → mobile setup page for entering credentials on phone.
- **Refund handling**: How to detect failed purchases and adjust the local budget.

---

## Comparable Products

- **[AgentMail](https://agentmail.to)** — Email infrastructure for AI agents (inspiration for distribution model)
- **x402** — HTTP-native payment protocol (potential future integration)

---

## Summary

AgentPay is to agent payments what AgentMail is to agent email: purpose-built infrastructure that gives AI agents a critical capability (spending money) while keeping humans in control (approval gates, budget limits) and keeping sensitive data secure (local-only encrypted vault + placeholder injection). No servers, no PCI scope, no regulatory burden. Open source, downloadable, and designed to become the standard for how agents do commerce.
