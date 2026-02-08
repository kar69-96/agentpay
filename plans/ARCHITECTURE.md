# Architecture

## Design Principles

1. **Local-first, stateless** — no servers, no databases. All data stored on the user's machine.
2. **Zero-knowledge credentials** — agent code never sees billing details. They flow from encrypted vault to browser DOM, bypassing the agent.
3. **Placeholder injection** — checkout forms show `{{placeholders}}`; real values are swapped milliseconds before submission.
4. **Wallet = budget tracker** — not held funds. A local counter that decrements on purchases. Merchant charges the card directly.
5. **Approval-gated** — every transaction requires cryptographically signed human approval.
6. **Open source** — fully auditable, forkable, no vendor lock-in.

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      AgentPay SDK (local)                       │
│              (npm package / MCP skill / curl)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────┐   ┌──────────────┐   ┌───────────────────────┐  │
│   │  Budget   │   │  Transaction │   │   Purchase Executor   │  │
│   │  Tracker  │   │   Manager    │   │ (Stagehand+Browserbase)│  │
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

## Components

### Budget Tracker (`packages/sdk/src/budget/`)
- Reads/writes `~/.agentpay/wallet.json`
- Tracks: total budget, remaining balance, per-transaction limit
- Read-only for agents; writable only via CLI (human)
- Checks balance before allowing proposals or executions

### Transaction Manager (`packages/sdk/src/transactions/`)
- Reads/writes `~/.agentpay/transactions.json`
- Transaction lifecycle: `pending` -> `approved`/`rejected` -> `executing` -> `completed`/`failed`
- Generates unique transaction IDs
- Stores purchase mandates (signed approvals)

### Approval Gate (`packages/sdk/src/auth/`)
- Manages Ed25519 keypair (`~/.agentpay/keys/`)
- Signs transaction approvals (purchase mandates)
- Verifies mandates before allowing execution
- Passphrase-protected private key

### Purchase Executor (`packages/sdk/src/executor/`)
- Spins up Browserbase sessions (recording disabled)
- Uses Stagehand to navigate merchant checkout
- Implements placeholder injection pattern:
  1. Fill form with `{{placeholders}}`
  2. Atomic `page.evaluate()` swaps values and submits
- Returns receipt to agent

### Credentials Vault (`packages/sdk/src/vault/`)
- Encrypts/decrypts billing credentials (AES-256-GCM)
- Key derivation from passphrase (PBKDF2, SHA-512, 100k iterations)
- Only decrypted in memory at checkout time
- Cleared from memory after use

### CLI (`packages/sdk/src/cli/`)
- `commander`-based CLI interface
- Human-facing commands: `setup`, `budget`, `pending`, `approve`, `reject`, `status`, `history`

### Web Setup Page (`packages/web/`)
- Next.js application for QR code-based setup
- Visual alternative to CLI `setup` command
- Credentials encrypted in browser, saved locally
- Agent generates QR code -> human scans -> enters credentials via web UI

## Data Flow

### Propose Purchase
```
Agent calls ap.transactions.propose({ merchant, amount, description })
        │
        ▼
Transaction Manager checks budget (sufficient balance? under per-tx limit?)
        │
        ▼
Creates transaction record in transactions.json (status: pending)
        │
        ▼
Returns transaction ID to agent
```

### Approve Purchase
```
Human runs agentpay approve <txId>
        │
        ▼
Prompts for passphrase
        │
        ▼
Signs transaction details with Ed25519 private key
        │
        ▼
Stores signed mandate in transactions.json (status: approved)
```

### Execute Purchase
```
Agent calls ap.transactions.execute(txId)
        │
        ▼
Verify signed mandate (Ed25519 signature check)
        │
        ▼
Check budget (still sufficient?)
        │
        ▼
Decrypt credentials (passphrase cached in memory)
        │
        ▼
Create Browserbase session (recording: false)
        │
        ▼
Stagehand navigates to merchant URL
        │
        ▼
Fill checkout form with {{placeholders}}
        │
        ▼
page.evaluate(): replace placeholders with real values, submit
        │
        ▼
Capture confirmation details
        │
        ▼
Update transaction (status: completed, receipt)
        │
        ▼
Decrement wallet balance
        │
        ▼
Destroy Browserbase session, clear credentials from memory
        │
        ▼
Return receipt to agent
```

## File Structure

```
~/.agentpay/
├── credentials.enc        # Encrypted billing credentials
├── keys/
│   ├── private.pem        # Ed25519 private key (passphrase-protected)
│   └── public.pem         # Ed25519 public key
├── wallet.json            # { budget: 200, balance: 170.01, limitPerTx: 50 }
├── transactions.json      # [{ id, status, merchant, amount, mandate, receipt }]
└── audit.log              # Append-only action log
```

## SDK vs Fork: Browserbase Handling

| Mode | Who manages Browserbase? |
|---|---|
| **SDK user** (`npm install agentpay`) | AgentPay handles it. User provides `BROWSERBASE_API_KEY` and `BROWSERBASE_PROJECT_ID`. |
| **Fork user** (clones repo) | User sets up their own Browserbase account and configures credentials. |
