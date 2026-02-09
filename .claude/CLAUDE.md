# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Published Packages

| npm Package | Source | Description |
|---|---|---|
| `@useagentpay/sdk` | `packages/sdk` | Core SDK + CLI (binary: `agentpay`) |
| `@useagentpay/mcp-server` | `packages/mcp-server` | MCP server — 8 tools, 3 resources, 3 prompts |

**GitHub**: `kar69-96/useagentpay`
**npm scope**: `@useagentpay`
**Registry**: https://www.npmjs.com/org/useagentpay

## Build & Development Commands

```bash
pnpm install              # Install all workspace dependencies
pnpm build                # Build all packages (turbo)
pnpm typecheck            # tsc --noEmit across monorepo
pnpm test                 # Run all tests (vitest)
pnpm dev                  # Watch mode for all packages
```

**Run a single test file:**
```bash
pnpm --filter @useagentpay/sdk vitest run src/vault/vault.test.ts
```

**Build/test a single package:**
```bash
pnpm --filter @useagentpay/sdk build            # SDK only
pnpm --filter @useagentpay/web build            # Web only
pnpm --filter @useagentpay/mcp-server build     # MCP server only
pnpm --filter @useagentpay/mcp-server test      # MCP server tests only
```

**Test the CLI after building:**
```bash
node packages/sdk/dist/cli.js --help
```

## Architecture

This is a pnpm workspace monorepo with turbo orchestration. Five packages: `packages/sdk` (published as `@useagentpay/sdk`), `packages/mcp-server` (published as `@useagentpay/mcp-server`), `packages/web` (Next.js), `examples/basic`, `examples/mcp`.

### Module Dependency Graph

```
CLI (cli.ts + commands/)
    ↓
AgentPay facade (agentpay.ts)
    ↓ composes
BudgetManager + TransactionManager + AuditLogger + PurchaseExecutor
    ↓ uses
vault/ + auth/ + utils/
    ↓
node:crypto + node:fs + @browserbasehq/stagehand
```

### MCP Server (`packages/mcp-server`)

Depends on `@useagentpay/sdk`. Exposes the full AgentPay lifecycle over MCP protocol:
- **8 tools**: `agentpay_status`, `agentpay_check_balance`, `agentpay_list_pending`, `agentpay_propose_purchase`, `agentpay_get_transaction`, `agentpay_wait_for_approval`, `agentpay_execute_purchase`, `agentpay_get_receipt`
- **3 resources**: `agentpay://wallet`, `agentpay://transactions/{txId}`, `agentpay://audit-log`
- **3 prompts**: `buy`, `budget-check`, `purchase-status`

Host config (Claude Desktop / Cursor / Claude Code):
```json
{ "mcpServers": { "agentpay": { "command": "npx", "args": ["@useagentpay/mcp-server"] } } }
```

Or via CLI: `agentpay mcp` (stdio) / `agentpay mcp --http` (HTTP)

### Core Security Model

**Three-layer credential protection:**
1. **Vault** — AES-256-GCM with PBKDF2 (SHA-512, 100k iterations). Random salt + IV per encryption. File at `~/.agentpay/credentials.enc`.
2. **Browserbase** — Sessions created with `recordSession: false`.
3. **Placeholder injection** — Stagehand fills forms with `%var%` variables (AI never sees real values). Real credentials swapped via atomic `page.evaluate()` at submission time.

**Purchase mandates** — Ed25519 signatures over SHA-256 hash of transaction details. Private key passphrase-protected (AES-256-CBC). Human must sign to approve any purchase.

### Transaction State Machine

```
pending → approved → executing → completed
       ↘ rejected             ↘ failed
```

Terminal states: `completed`, `rejected`, `failed`. Invalid transitions throw. Budget only deducted on `completed`.

### Data Persistence

All state is file-based JSON under `~/.agentpay/` (overridable via `AGENTPAY_HOME`):
- `credentials.enc` — encrypted billing credentials (mode 0600)
- `keys/private.pem`, `keys/public.pem` — Ed25519 keypair
- `wallet.json` — `{ budget, balance, limitPerTx, spent }`
- `transactions.json` — array of Transaction objects
- `audit.log` — append-only, tab-separated: `timestamp\tACTION\t{json}`

## Key Conventions

- **Pure `node:crypto`** for all cryptographic operations — no external crypto dependencies.
- **ESM with `.js` extensions** in all imports (required for Node ESM resolution through tsup).
- **Co-located tests** — test files sit next to source (`vault.test.ts` next to `vault.ts`).
- **tsup** bundles the SDK into ESM + CJS + DTS. The CLI entry is `src/cli.ts`, the library entry is `src/index.ts`.
- **Dynamic imports** in CLI commands — each command is lazily loaded via `await import()` in the commander action handler.
- **Stagehand v3 API** — page access is `stagehand.context.activePage()`, act takes `(instruction: string, options?)`, extract takes `(instruction: string)`.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `BROWSERBASE_API_KEY` | Required for purchase execution |
| `BROWSERBASE_PROJECT_ID` | Required for purchase execution |
| `AGENTPAY_HOME` | Override `~/.agentpay/` data directory |
| `AGENTPAY_WEB_URL` | QR code base URL (default: `http://localhost:3000`) |
| `AGENTPAY_PASSPHRASE` | MCP server: passphrase for execute (env mode) |
| `AGENTPAY_PASSPHRASE_SERVER` | MCP server: URL to fetch passphrase (server mode) |
| `MCP_TRANSPORT` | MCP server: set to `http` for HTTP transport |
| `MCP_HTTP_PORT` | MCP server: HTTP port (default: 3100) |

## Error Classes

All in `src/errors.ts` with a `code` property: `NotSetupError`, `DecryptError`, `InsufficientBalanceError`, `ExceedsTxLimitError`, `NotApprovedError`, `InvalidMandateError`, `AlreadyExecutedError`, `CheckoutFailedError`, `TimeoutError`.

## Release & Publishing

- **Changesets** manages versioning: `pnpm changeset` to create, merged to `main` triggers publish
- **Release workflow** (`.github/workflows/release.yml`): runs on push to `main`, publishes via `changesets/action`
- **npm token**: `NPM_TOKEN` secret in GitHub Actions (from `useagentpay` npm account)
- Private packages (`@useagentpay/web`, examples) are listed in `.changeset/config.json` `ignore`
