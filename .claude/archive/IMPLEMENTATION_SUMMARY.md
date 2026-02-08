# AgentPay Implementation Summary

## What Was Built

AgentPay is a local-first, open-source payments SDK that lets AI agents make web purchases securely. The agent never sees billing credentials — they're encrypted locally, and real values only appear in the browser DOM for milliseconds during checkout.

The entire codebase was built from scratch (the repo previously contained only documentation) across 6 phases.

---

## Architecture

### Monorepo Structure

```
packages/sdk/          → Core SDK, published as `agentpay` on npm
packages/web/          → Next.js setup page (client-side encryption)
examples/basic/        → Minimal propose → approve → execute workflow
examples/mcp/          → MCP tool definitions for AI agent integration
```

### SDK Module Layout (`packages/sdk/src/`)

```
vault/       → AES-256-GCM credential encryption (node:crypto)
auth/        → Ed25519 keypair + purchase mandate signing
budget/      → Wallet with budget/limit enforcement (wallet.json)
transactions/→ State machine: pending→approved→executing→completed
executor/    → Browserbase+Stagehand checkout with placeholder injection
audit/       → Append-only action log
commands/    → 9 CLI commands (setup, budget, pending, approve, reject, status, history, qr, reset)
utils/       → paths, ids, display helpers, prompt utilities
agentpay.ts  → Facade class that ties everything together
cli.ts       → Commander entry point
```

### Local Data (`~/.agentpay/`)

```
credentials.enc    → AES-256-GCM encrypted billing credentials (mode 0600)
keys/private.pem   → Ed25519 private key, passphrase-protected (mode 0600)
keys/public.pem    → Ed25519 public key (mode 0644)
wallet.json        → { budget, balance, limitPerTx, spent }
transactions.json  → Array of Transaction objects with state machine
audit.log          → Tab-separated: timestamp \t ACTION \t {json}
```

---

## How It Works

### The Three-Layer Credential Protection

1. **Encrypted at rest** — Credentials stored as AES-256-GCM ciphertext. Key derived via PBKDF2 (SHA-512, 100k iterations). Passphrase never stored.

2. **Browserbase recording disabled** — Sessions created with `recordSession: false`. No screenshots or replays.

3. **Placeholder injection** — Stagehand fills forms with `%var%` placeholders (AI never sees real values). Real credentials swapped in via atomic `page.evaluate()` milliseconds before form submission.

### Transaction Flow

```
Agent calls ap.transactions.propose()
    → Budget/limit check
    → Transaction created with status: pending
    → Saved to transactions.json

Human runs `agentpay approve <txId>`
    → Prompted for passphrase
    → Ed25519 mandate signed (SHA-256 hash of tx details)
    → Transaction status: approved

Agent calls ap.transactions.execute(txId)
    → Verify mandate signature
    → Check balance
    → Mark status: executing
    → Decrypt credentials from vault
    → PurchaseExecutor runs Stagehand checkout
    → On success: mark completed, deduct balance, store receipt
    → On failure: mark failed, balance unchanged
```

### SDK API (for agents)

```typescript
import { AgentPay } from 'agentpay';

const ap = new AgentPay({ passphrase: '...' });

// Propose a purchase
const tx = ap.transactions.propose({
  merchant: 'amazon.com',
  amount: 29.99,
  description: 'Wireless mouse',
  url: 'https://amazon.com/dp/123',
});

// Wait for human approval
const result = await ap.transactions.waitForApproval(tx.id);

// Execute (needs BROWSERBASE_API_KEY)
const receipt = await ap.transactions.execute(tx.id);
```

### CLI Commands (for humans)

| Command | Purpose |
|---------|---------|
| `agentpay setup` | Interactive: passphrase, card, address → encrypt vault + generate keypair |
| `agentpay budget --set 200` | Set spending budget |
| `agentpay budget --limit-per-tx 50` | Set per-transaction limit |
| `agentpay pending` | List pending proposals as table |
| `agentpay approve <txId>` | Sign mandate with passphrase |
| `agentpay reject <txId> --reason "..."` | Reject with optional reason |
| `agentpay status` | Balance, limits, pending count, recent txs |
| `agentpay history` | Full transaction history |
| `agentpay qr` | Display QR code for web-based setup |
| `agentpay reset` | Delete all `~/.agentpay/` data |

---

## Build & Test

```bash
pnpm install          # Install all dependencies
pnpm build            # Build all 4 packages via turbo
pnpm typecheck        # tsc --noEmit across monorepo
pnpm test             # 59 tests via vitest
```

### Test Coverage

| Module | Tests | What's Tested |
|--------|-------|--------------|
| vault | 9 | encrypt/decrypt round-trip, wrong passphrase, tampered ciphertext, file I/O |
| auth | 9 | keypair generation, mandate sign/verify, tampered signatures, wrong keys |
| budget | 10 | setBudget, limits, deduction, insufficient balance, per-tx limit |
| transactions | 12 | full state machine, all valid/invalid transitions, getPending/getHistory |
| audit | 4 | log creation, ISO timestamps, append, empty log |
| executor | 5 | placeholder mapping, swap map, PurchaseExecutor instantiation |
| utils | 10 | generateTxId pattern, formatCurrency, paths with/without env var |

### Key Dependencies

- `commander` — CLI framework
- `@browserbasehq/stagehand` v3 — AI-driven browser automation
- `node:crypto` — All encryption/signing (zero external crypto deps)
- `qrcode` / `qrcode.react` — QR code generation
- `tsup` — SDK bundler (ESM + CJS + DTS)
- `vitest` — Test runner
- `turbo` — Monorepo orchestration

### Environment Variables

| Variable | Required For | Default |
|----------|-------------|---------|
| `BROWSERBASE_API_KEY` | Executing purchases | — |
| `BROWSERBASE_PROJECT_ID` | Executing purchases | — |
| `AGENTPAY_HOME` | Custom data directory | `~/.agentpay` |
| `AGENTPAY_WEB_URL` | QR code URL base | `http://localhost:3000` |

---

## Web Setup Page

The Next.js app at `packages/web/` provides a browser-based setup flow:

1. Choose passphrase
2. Enter card information
3. Enter personal info + address
4. Set budget with slider

All encryption happens client-side using Web Crypto API (AES-256-GCM with identical parameters to the Node.js SDK). The encrypted vault file is downloaded — credentials never leave the browser.

---

## CI/CD

- `.github/workflows/ci.yml` — Runs typecheck + build + test on push/PR (Node 20 + 22)
- `.github/workflows/release.yml` — Changesets-based npm publishing
- `.changeset/config.json` — Configured for public access, ignoring web/examples
