# AgentPay

> Payments for AI agents. Local-first, human-approved, encrypted.

AgentPay is an open-source MCP server that gives AI agents the ability to make purchases on the web — without ever seeing a user's credit card. Credentials are encrypted locally, every purchase requires human approval with cryptographic signatures, and checkout happens via headless browser with placeholder injection.

Works with Claude Desktop, Cursor, Claude Code, Windsurf, and any MCP-compatible host.

350+ package downloads and counting!
https://useagentpay.com

## Install

```bash
npx -p @useagentpay/mcp-server agentpay init
```

Requires Node.js 20+. This creates an `agentpay/` folder in your project with an `AGENT.md` file for AI agents to read.

## Quick Start

**Human — set up credentials and budget:**
```bash
npx -p @useagentpay/mcp-server agentpay setup       # opens browser to enter card, set budget & limits
npx -p @useagentpay/mcp-server agentpay dashboard   # manage wallet, approve/reject purchases
```

All budget, spending limits, funds, and credential changes happen through the browser dashboard — not the terminal.

**Agent — connect via MCP:**

Add to your MCP host config (Claude Desktop, Cursor, Claude Code, Windsurf):
```json
{ "mcpServers": { "agentpay": { "command": "npx", "args": ["-p", "@useagentpay/mcp-server", "agentpay", "serve"] } } }
```

The agent reads `agentpay/AGENT.md` for instructions on how to propose purchases, wait for approval, and execute.

## How It Works

1. Human sets up credentials and budget via browser dashboard (`agentpay/` folder stores encrypted data)
2. Agent proposes a purchase — human reviews and approves through the dashboard (cryptographically signed)
3. Local Chromium session fills checkout with `{{placeholders}}`
4. Real values swapped in milliseconds before form submission — agent never sees them
5. Agent gets a receipt. That's it.

## Security

- **Credentials never leave your machine** — everything runs on local Chromium
- **Placeholder injection** — forms show `{{card_number}}` until the instant of submission
- **Signed purchase mandates** — Ed25519 proof that a real human approved each transaction (inspired by [Google AP2](https://github.com/google-agentic-commerce/AP2))
- **Dashboard-only configuration** — agents cannot modify budgets, limits, or credentials
- **Open source** — audit the entire security model

## MCP Server

9 tools, 3 resources, 3 prompts — covers the full purchase lifecycle.

| Tool | Description |
|------|-------------|
| `agentpay_status` | Check setup state, balance, budget |
| `agentpay_check_balance` | Current balance + limits |
| `agentpay_propose_purchase` | Propose a purchase |
| `agentpay_request_mobile_approval` | Send approval link to user's phone |
| `agentpay_wait_for_approval` | Wait for human approval |
| `agentpay_execute_purchase` | Execute approved purchase |
| `agentpay_get_receipt` | Get receipt |
| `agentpay_list_pending` | List pending proposals |
| `agentpay_get_transaction` | Get transaction details |

## Docs

| Doc | Description |
|---|---|
| [Usage Guide](USAGE.md) | CLI commands, MCP server details |

## License

MIT
