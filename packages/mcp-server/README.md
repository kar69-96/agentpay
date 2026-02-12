# @useagentpay/mcp-server

MCP server for [AgentPay](https://github.com/kar69-96/useagentpay) — exposes the full payment lifecycle to any MCP-compatible AI host (Claude Desktop, Cursor, Claude Code, Windsurf).

8 tools, 3 resources, 3 prompts. Agents can propose purchases, wait for human approval, execute checkout, and retrieve receipts — all over the Model Context Protocol.

## Install & Setup

```bash
npx agentpay init     # creates agentpay/ folder with AGENT.md
npx agentpay setup    # opens browser to enter card, set budget & limits
```

## Host Configuration

Add to your Claude Desktop, Cursor, or Claude Code config:

```json
{
  "mcpServers": {
    "agentpay": {
      "command": "npx",
      "args": ["-p", "@useagentpay/mcp-server", "agentpay", "serve"]
    }
  }
}
```

### With passphrase (for execute)

```json
{
  "mcpServers": {
    "agentpay": {
      "command": "npx",
      "args": ["-p", "@useagentpay/mcp-server", "agentpay", "serve"],
      "env": {
        "AGENTPAY_PASSPHRASE": "your-passphrase"
      }
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `agentpay_status` | Check if setup is complete, balance, budget, pending count |
| `agentpay_check_balance` | Current balance and limits (call before proposing) |
| `agentpay_list_pending` | Pending transactions awaiting approval |
| `agentpay_propose_purchase` | Propose a new purchase (merchant, amount, description, url) |
| `agentpay_get_transaction` | Get transaction details by ID |
| `agentpay_wait_for_approval` | Long-poll until approved or rejected |
| `agentpay_execute_purchase` | Execute an approved purchase (requires passphrase config) |
| `agentpay_get_receipt` | Get receipt for a completed purchase |

## Resources

| URI | Description |
|-----|-------------|
| `agentpay://wallet` | Wallet balance and limits |
| `agentpay://transactions/{txId}` | Transaction details |
| `agentpay://audit-log` | Last 50 audit log entries |

## Prompts

| Name | Description |
|------|-------------|
| `buy` | Guided step-by-step purchase flow |
| `budget-check` | Balance and pending transaction summary |
| `purchase-status` | Recent transaction history |

## Typical Agent Flow

```
1. agentpay_status          → verify setup is complete
2. agentpay_check_balance   → confirm budget for purchase
3. agentpay_propose_purchase → create pending transaction
4. agentpay_wait_for_approval → wait for human to approve
5. agentpay_execute_purchase → run checkout via headless browser
6. agentpay_get_receipt      → retrieve confirmation
```

## Passphrase Modes

The `execute_purchase` tool needs access to the vault passphrase. Three modes:

| Mode | Config | Description |
|------|--------|-------------|
| **env** | `AGENTPAY_PASSPHRASE` | Passphrase from environment variable |
| **server** | `AGENTPAY_PASSPHRASE_SERVER` | Fetch passphrase from a URL |
| **none** | Neither set | Read-only — propose/approve works, execute does not |

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `AGENTPAY_PASSPHRASE` | Passphrase for execute (env mode) | — |
| `AGENTPAY_PASSPHRASE_SERVER` | URL to fetch passphrase (server mode) | — |
| `ANTHROPIC_API_KEY` | LLM API key for browser navigation | — |
| `AGENTPAY_HOME` | Override data directory | `./agentpay` |
| `MCP_TRANSPORT` | Set to `http` for HTTP transport | `stdio` |
| `MCP_HTTP_PORT` | HTTP port | `3100` |

## License

MIT
