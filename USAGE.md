# AgentPay Usage Guide

## Installation

```bash
npx -p @useagentpay/mcp-server agentpay init
```

This creates an `agentpay/` folder in your project directory with an `AGENT.md` file containing instructions for AI agents.

## Quick Start

```bash
# 1. Initialize (creates agentpay/ folder)
npx -p @useagentpay/mcp-server agentpay init

# 2. Set up credentials, budget, and limits (opens browser)
npx -p @useagentpay/mcp-server agentpay setup

# 3. Connect MCP server to your AI host (see below)

# 4. Manage wallet, approve/reject purchases
npx -p @useagentpay/mcp-server agentpay dashboard
```

---

## Commands

### `npx -p @useagentpay/mcp-server agentpay init`

Initialize AgentPay in the current directory. Creates `agentpay/` folder with `AGENT.md`.

### `npx -p @useagentpay/mcp-server agentpay setup`

Opens a browser window on localhost for the human to:
- Enter card and billing details (encrypted with AES-256-GCM)
- Generate Ed25519 keypair for signing approvals
- Set budget and per-transaction spending limits

After setup, the `agentpay/` folder contains:
- `credentials.enc` — encrypted billing credentials
- `keys/public.pem` — Ed25519 public key
- `keys/private.pem` — Ed25519 private key (passphrase-protected)
- `wallet.json` — budget, balance, per-tx limit, spent total
- `transactions.json` — transaction log
- `audit.log` — append-only action log

### `npx -p @useagentpay/mcp-server agentpay dashboard`

Opens the browser dashboard for the human to:
- Approve or reject pending purchases
- Change budget and spending limits
- Add funds
- Update payment credentials
- View transaction history

All wallet configuration happens here — not via CLI or MCP tools.

```bash
npx -p @useagentpay/mcp-server agentpay dashboard
npx -p @useagentpay/mcp-server agentpay dashboard --port 8080
```

| Flag | Description |
|------|-------------|
| `--port <port>` | Server port (default: `3141`) |

### `npx -p @useagentpay/mcp-server agentpay status`

Show wallet balance, budget, limits, pending count, and recent transactions (read-only).

### `npx -p @useagentpay/mcp-server agentpay pending`

List all pending purchase proposals awaiting approval (read-only).

### `npx -p @useagentpay/mcp-server agentpay history`

Show full transaction history (read-only).

Status values: `[pending]`, `[approved]`, `[executing]`, `[completed]`, `[rejected]`, `[failed]`.

### `npx -p @useagentpay/mcp-server agentpay approve <txId>`

Approve a pending purchase. Opens a browser window to collect the passphrase and sign an Ed25519 mandate.

### `npx -p @useagentpay/mcp-server agentpay reject <txId>`

Reject a pending purchase.

```bash
npx -p @useagentpay/mcp-server agentpay reject tx_abc123
npx -p @useagentpay/mcp-server agentpay reject tx_abc123 --reason "Too expensive"
```

### `npx -p @useagentpay/mcp-server agentpay reset`

Delete all AgentPay data. Requires typing `YES` to confirm.

### `npx -p @useagentpay/mcp-server agentpay serve`

Start the MCP server.

```bash
npx -p @useagentpay/mcp-server agentpay serve          # stdio (default)
npx -p @useagentpay/mcp-server agentpay serve --http   # HTTP transport
```

---

## Workflows

### Human-in-the-loop (agent proposes, human approves via dashboard)

```
Agent                               Human (browser dashboard)
  │                                   │
  ├─ propose purchase ──────────────►│
  │                                   ├─ review in dashboard
  │                                   ├─ approve (signs mandate)
  │◄── poll for approval ────────────┤
  ├─ execute purchase                 │
  ├─ return receipt                   │
  │                                   ├─ view in dashboard
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

## Data Directory (`agentpay/`)

| File | Purpose |
|------|---------|
| `AGENT.md` | Instructions for AI agents |
| `credentials.enc` | AES-256-GCM encrypted billing credentials |
| `keys/private.pem` | Ed25519 private key (passphrase-protected) |
| `keys/public.pem` | Ed25519 public key |
| `wallet.json` | Budget, balance, per-tx limit, spent total |
| `transactions.json` | All transactions |
| `audit.log` | Append-only log (`timestamp\tACTION\t{json}`) |

---

## MCP Server

AgentPay exposes its full lifecycle via MCP (Model Context Protocol), so any compatible host can use it.

### Host Configuration

Add to your Claude Desktop, Cursor, or Claude Code config:
```json
{ "mcpServers": { "agentpay": { "command": "npx", "args": ["-p", "@useagentpay/mcp-server", "agentpay", "serve"] } } }
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

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `ANTHROPIC_API_KEY` | LLM API key for AI-driven browser navigation | — |
| `AGENTPAY_HOME` | Override data directory | `./agentpay` |
| `AGENTPAY_PASSPHRASE` | Passphrase for execute (env mode) | — |
| `AGENTPAY_PASSPHRASE_SERVER` | URL to fetch passphrase (server mode) | — |
| `MCP_TRANSPORT` | Set to `http` for HTTP transport | `stdio` |
| `MCP_HTTP_PORT` | HTTP port | `3100` |

---

## Error Codes

| Error | Meaning |
|-------|---------|
| `NotSetupError` | Run setup first |
| `DecryptError` | Wrong passphrase |
| `InsufficientBalanceError` | Purchase exceeds remaining budget |
| `ExceedsTxLimitError` | Purchase exceeds per-transaction limit |
| `NotApprovedError` | Transaction not yet approved |
| `InvalidMandateError` | Mandate signature missing or invalid |
| `AlreadyExecutedError` | Transaction already completed or failed |
| `CheckoutFailedError` | Browser checkout did not succeed |
| `TimeoutError` | Operation timed out |
