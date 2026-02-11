# AgentPay

> Secure payments infrastructure for AI agents.


AgentPay lets AI agents purchase things on the web without ever seeing a user's credit card. Credentials are encrypted locally, purchases require human approval with cryptographic signatures, and checkout happens via headless browser with placeholder injection — real values exist in the DOM for milliseconds.

Everything runs on the user's machine — local Chromium via Playwright, local encryption, local keys.

## Install

```bash
npm install @useagentpay/sdk
```

## Quick Start

**Human — set up credentials:**
```bash
agentpay setup       # encrypt & store billing credentials locally
agentpay budget --set 200
```

**Agent — propose & execute:**
```typescript
import { AgentPay } from '@useagentpay/sdk';
const ap = new AgentPay();

const tx = await ap.transactions.propose({
  merchant: 'amazon.com',
  amount: 29.99,
  description: 'Wireless mouse',
  url: 'https://amazon.com/dp/B09ABC1234',
});

const result = await ap.transactions.waitForApproval(tx.id);

if (result.status === 'approved') {
  const receipt = await ap.transactions.execute(tx.id);
}
```

**Human — approve:**
```bash
agentpay approve tx_a1b2c3   # signs with your local keypair
```

## How It Works

1. Human encrypts billing credentials locally (`~/.agentpay/credentials.enc`)
2. Agent proposes a purchase — human reviews and approves (cryptographically signed)
3. Local Chromium session fills checkout with `{{placeholders}}`
4. Real values swapped in milliseconds before form submission — agent never sees them
5. Agent gets a receipt. That's it.

## Security

- **Credentials never leave your machine** — everything runs on local Chromium
- **Placeholder injection** — forms show `{{card_number}}` until the instant of submission
- **Signed purchase mandates** — Ed25519 proof that a real human approved each transaction (inspired by [Google AP2](https://github.com/google-agentic-commerce/AP2))
- **Open source** — audit the entire security model

## Browser Providers

By default, AgentPay runs a local Chromium browser via Playwright + [Stagehand](https://github.com/browserbase/stagehand). No cloud services needed.

You can plug in a custom browser provider by implementing the `BrowserProvider` interface:

```typescript
import { AgentPay, type BrowserProvider } from '@useagentpay/sdk';

const ap = new AgentPay({
  executor: {
    provider: myCustomProvider,
    modelApiKey: process.env.ANTHROPIC_API_KEY,
  },
});
```

## MCP Server

Use AgentPay from any MCP-compatible host (Claude Desktop, Cursor, Claude Code, Windsurf):

```bash
npx @useagentpay/mcp-server
```

Or add to your host config:
```json
{ "mcpServers": { "agentpay": { "command": "npx", "args": ["@useagentpay/mcp-server"] } } }
```

8 tools, 3 resources, 3 prompts — covers the full purchase lifecycle. See the [MCP server package](packages/mcp-server/) for details.

## Packages

| Package | Description |
|---|---|
| [`@useagentpay/sdk`](https://www.npmjs.com/package/@useagentpay/sdk) | Core SDK + CLI |
| [`@useagentpay/mcp-server`](https://www.npmjs.com/package/@useagentpay/mcp-server) | MCP server for AI hosts |

## Docs

| Doc | Description |
|---|---|
| [Usage Guide](USAGE.md) | CLI commands, SDK usage, MCP server details |


## License

MIT
