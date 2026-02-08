# AgentPay Implementation Plan

## Context

AgentPay is a local-first, open-source payments SDK for AI agents. The repo currently has **only documentation** (PROJECT.md, docs/) and a README — no source code, no package.json, no configs. This plan takes it from zero to a working product across 6 phases.

The core idea: agents propose purchases, humans approve them with cryptographic signatures (Ed25519 purchase mandates inspired by Google AP2), and Browserbase+Stagehand executes checkout with placeholder injection — so the agent never sees credentials.

---

## Phase 1: Monorepo Scaffolding + Build Pipeline

- [ ] **Root configs**: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.json`, `.gitignore`, `LICENSE`
- [ ] **SDK package** (`packages/sdk/`): `package.json` (name: `agentpay`, ESM+CJS exports, bin), `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`
- [ ] **SDK stubs**: `src/index.ts` (placeholder export), `src/cli.ts` (minimal commander)
- [ ] **Type definitions**: `src/vault/types.ts`, `src/auth/types.ts`, `src/budget/types.ts`, `src/transactions/types.ts`, `src/executor/types.ts`
- [ ] **Error classes**: `src/errors.ts` (`NotSetupError`, `DecryptError`, `InsufficientBalanceError`, `ExceedsTxLimitError`, `NotApprovedError`, `InvalidMandateError`, `AlreadyExecutedError`, `CheckoutFailedError`, `TimeoutError`)
- [ ] **Utilities**: `src/utils/paths.ts`, `src/utils/ids.ts`, `src/utils/display.ts`
- [ ] **Web stub** (`packages/web/`): `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `src/app/layout.tsx`, `src/app/page.tsx`

### Tests

| Test | Expected |
|---|---|
| `pnpm install` completes | No errors |
| `pnpm build` (turbo) | `packages/sdk/dist/` has `index.js`, `index.cjs`, `index.d.ts`, `cli.js` |
| `pnpm typecheck` | tsc passes for both packages |
| `pnpm test` | vitest exits cleanly |
| `node packages/sdk/dist/cli.js --help` | Prints help text |
| `generateTxId()` | Matches `/^tx_[0-9a-f]{8}$/` |
| `formatCurrency(29.99)` | Returns `"$29.99"` |
| `getHomePath()` | Returns `~/.agentpay` (or `$AGENTPAY_HOME` if set) |

---

## Phase 2: Core Crypto — Vault + Auth

- [ ] **Vault** (`src/vault/vault.ts`): `deriveKey()` (PBKDF2, SHA-512, 100k iter), `encrypt()`, `decrypt()`, `saveVault()`, `loadVault()`
- [ ] **Vault tests** (`src/vault/vault.test.ts`)
- [ ] **Keypair** (`src/auth/keypair.ts`): `generateKeyPair()` (Ed25519), `saveKeyPair()`, `loadPublicKey()`, `loadPrivateKey()`
- [ ] **Mandate** (`src/auth/mandate.ts`): `createMandate()` (SHA-256 hash + Ed25519 sign), `verifyMandate()`
- [ ] **Auth tests** (`src/auth/mandate.test.ts`)
- [ ] **Update** `src/index.ts` with vault + auth exports

### Tests

| Test | Expected |
|---|---|
| Encrypt then decrypt (correct passphrase) | Returns identical `BillingCredentials` |
| Decrypt with wrong passphrase | Throws `DecryptError` |
| Two encryptions of same data | Different ciphertexts (random salt/IV) |
| Tampered ciphertext | Throws on decrypt (GCM auth tag fails) |
| `saveVault` + `loadVault` round-trip | File created, loads back correctly |
| `loadVault` on missing file | Throws `NotSetupError` |
| Full credentials round-trip (all fields) | card, name, addresses, email, phone survive |
| Unicode in name/address | Encrypts and decrypts correctly |
| Generate keypair | Returns valid PEM strings |
| Create + verify mandate | `verifyMandate` returns `true` |
| Tampered amount after signing | `verifyMandate` returns `false` |
| Tampered signature | `verifyMandate` returns `false` |
| Wrong public key | `verifyMandate` returns `false` |
| Wrong passphrase for signing | Throws error |
| Same txDetails → same hash | Deterministic hashing |

---

## Phase 3: Budget + Transactions + Audit

- [ ] **Budget** (`src/budget/budget.ts`): `BudgetManager` class — `getWallet()`, `setBudget()`, `setLimitPerTx()`, `deductBalance()`, `checkProposal()`, `getBalance()`
- [ ] **Budget tests** (`src/budget/budget.test.ts`)
- [ ] **Transactions** (`src/transactions/manager.ts`): `TransactionManager` class — `propose()`, `get()`, `approve()`, `reject()`, `markExecuting()`, `markCompleted()`, `markFailed()`, `list()`, `getPending()`, `getHistory()`
- [ ] **Poller** (`src/transactions/poller.ts`): `waitForApproval()` — poll until approved/rejected/timeout
- [ ] **Transaction tests** (`src/transactions/manager.test.ts`)
- [ ] **Audit** (`src/audit/logger.ts`): `AuditLogger` class — `log()`, `getLog()`
- [ ] **Audit tests** (`src/audit/logger.test.ts`)
- [ ] **SDK Facade** (`src/agentpay.ts`): `AgentPay` class with `wallet`, `transactions`, `status()` matching docs/API_REFERENCE.md
- [ ] **Update** `src/index.ts` — export `AgentPay` and all types

### Tests

| Test | Expected |
|---|---|
| `setBudget(200)` | wallet.json: `{ budget: 200, balance: 200, spent: 0 }` |
| `deductBalance(30)` from 200 | balance=170, spent=30 |
| `deductBalance(250)` from 200 | Throws `InsufficientBalanceError` |
| `checkProposal(60)` with limit=50 | Throws `ExceedsTxLimitError` |
| `getWallet()` on missing file | Throws `NotSetupError` |
| `propose()` creates pending tx | Returns `Transaction` with `status: 'pending'` |
| `propose()` exceeding budget | Throws `InsufficientBalanceError` |
| `approve()` on pending tx | Status → `approved`, mandate stored |
| `approve()` on non-pending tx | Throws |
| `reject()` on pending tx | Status → `rejected` |
| Full lifecycle: propose → approve → executing → completed | All transitions succeed |
| Invalid state transition (pending → executing) | Throws |
| `waitForApproval()` resolves on approval | Returns approved tx |
| `waitForApproval()` times out | Throws `TimeoutError` |
| Audit entries have ISO timestamps | Lines match expected format |
| `AgentPay.status()` returns aggregate | Contains balance, pending, recent |

---

## Phase 4: CLI Commands

- [ ] **Prompt utility** (`src/utils/prompt.ts`): `promptPassphrase()`, `promptInput()`, `promptConfirm()` via `node:readline`
- [ ] **Display helpers** (`src/utils/display.ts`): `formatTable()`, `formatStatus()`, `formatTimestamp()`
- [ ] **setup** (`src/commands/setup.ts`): passphrase → card → personal info → encrypt vault + generate keypair + create wallet
- [ ] **budget** (`src/commands/budget.ts`): `--set`, `--limit-per-tx`
- [ ] **pending** (`src/commands/pending.ts`): list pending proposals as table
- [ ] **approve** (`src/commands/approve.ts`): prompt passphrase, sign mandate, update status
- [ ] **reject** (`src/commands/reject.ts`): `--reason`, update status
- [ ] **status** (`src/commands/status.ts`): balance, limits, pending count, recent
- [ ] **history** (`src/commands/history.ts`): full transaction table
- [ ] **reset** (`src/commands/reset.ts`): confirm then delete ~/.agentpay/
- [ ] **Update** `src/cli.ts` — register all commands with commander

### Tests

| Test | Expected |
|---|---|
| `setup` with valid inputs | Creates credentials.enc, private.pem, public.pem, wallet.json |
| `budget --set 200` | wallet.json updated |
| `budget --limit-per-tx 50` | limitPerTx updated |
| `pending` with no pending | Prints "No pending purchases." |
| `pending` with 2 pending txs | Prints formatted 2-row table |
| `approve` valid pending tx | Status → approved, mandate stored |
| `approve` wrong passphrase | Prints error |
| `reject --reason "too expensive"` | Status → rejected, reason stored |
| `status` | Prints balance, limits, pending count, recent |
| `history` | Prints all non-pending transactions |
| `reset` with "YES" | Removes ~/.agentpay/ |
| E2E: setup → budget → SDK propose → CLI approve → SDK sees approved | Full human+agent workflow |

---

## Phase 5: Purchase Executor (Browserbase + Stagehand)

- [ ] **Executor** (`src/executor/executor.ts`): `PurchaseExecutor` class
  - Create Stagehand with `recordSession: false`
  - Navigate to merchant URL
  - Fill forms with `{{placeholders}}` via Stagehand `%var%` syntax (not sent to LLM)
  - Atomic `page.evaluate((creds) => { replace placeholders, submit }, credentials)`
  - Extract confirmation via `page.extract()`
  - Close session in `finally`
- [ ] **Placeholder** (`src/executor/placeholder.ts`): `PLACEHOLDER_MAP`, `fillWithPlaceholders()`, `atomicSwapAndSubmit()`
- [ ] **Executor tests** (`src/executor/executor.test.ts`) — mocked Stagehand
- [ ] **Wire up** `src/agentpay.ts` — real `execute()`: verify mandate → check balance → decrypt vault → Browserbase → receipt
- [ ] **Add deps**: `@browserbasehq/stagehand`, `zod`

### Tests

| Test | Expected |
|---|---|
| `fillWithPlaceholders()` uses `%var%` syntax in act() | Variables not sent to LLM |
| `atomicSwapAndSubmit()` calls `page.evaluate` with credentials | Creds passed as serialized arg |
| Stagehand created with `recordSession: false` | Config verified |
| Session closed in finally block | Cleanup runs even on error |
| Rejects if mandate invalid | Throws `InvalidMandateError` |
| Rejects if tx not approved | Throws `NotApprovedError` |
| On checkout failure → tx marked failed | Balance NOT deducted |
| On checkout success → tx marked completed | Balance deducted, receipt stored |
| **Integration** (gated by env var): fill + swap on test HTML form | Form submitted successfully |

---

## Phase 6: Web (Next.js Setup Page) + Examples + Polish

- [ ] **Web layout** (`packages/web/src/app/`): `layout.tsx`, `globals.css`, `page.tsx`, `setup/page.tsx`
- [ ] **Web components**: `SetupForm.tsx` (4 steps), `QRCode.tsx`, `BudgetSlider.tsx`, `SuccessScreen.tsx`
- [ ] **Web encryption** (`packages/web/src/lib/encrypt.ts`): Web Crypto API AES-256-GCM (cross-compatible with SDK vault)
- [ ] **QR in SDK**: `src/commands/qr.ts`, `wallet.generateFundingQR()`, add `qrcode` dep
- [ ] **Examples**: `examples/basic/` (minimal agent), `examples/mcp/` (MCP skill)
- [ ] **CI**: `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `.changeset/config.json`
- [ ] **Docs**: `CONTRIBUTING.md`, update `README.md`

### Tests

| Test | Expected |
|---|---|
| Web Crypto encrypt → Node.js decrypt | Cross-environment round-trip works |
| `generateFundingQR({ suggestedBudget: 100 })` | URL contains `?budget=100`, valid QR data |
| `examples/basic` compiles | `tsc --noEmit` passes |
| `examples/mcp` compiles | `tsc --noEmit` passes |
| Web setup form renders all steps | 4 steps navigable |

---

## Phase Dependency Graph

```
Phase 1: Scaffolding
    │
Phase 2: Vault + Auth (node:crypto)
    │
Phase 3: Budget + Transactions + Audit
    │
Phase 4: CLI Commands
    │
Phase 5: Executor (Browserbase + Stagehand)
    │
Phase 6: Web + Examples + Polish
```

## Key Reference Files

| File | Used For |
|---|---|
| `docs/FILE_STRUCTURE.md` | Exact files and directory layout |
| `docs/SECURITY.md` | Crypto algorithms, key derivation params, mandate flow |
| `docs/API_REFERENCE.md` | SDK method signatures, CLI commands, error codes |
| `docs/ARCHITECTURE.md` | Component boundaries, data flows, state transitions |
| `docs/USER_FLOW.md` | CLI output formats, interactive prompts, agent SDK usage |

## End-to-End Verification

```bash
# 1. Build
pnpm install && pnpm build

# 2. Human sets up
agentpay setup
agentpay budget --set 200

# 3. Agent proposes (SDK)
# ap.transactions.propose({ merchant: 'amazon.com', amount: 29.99, ... })

# 4. Human approves
agentpay pending
agentpay approve tx_XXXXXXXX

# 5. Agent executes (needs BROWSERBASE_API_KEY)
# ap.transactions.execute(txId) → receipt

# 6. Verify
agentpay status
```
