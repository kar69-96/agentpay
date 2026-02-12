# @useagentpay/sdk

Secure payments infrastructure for AI agents. Local-first SDK and CLI that lets agents purchase things on the web without ever seeing a user's credit card.

Credentials are encrypted locally, purchases require human approval with Ed25519 signatures, and checkout happens via headless browser with placeholder injection — real values exist in the DOM for milliseconds.

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
agentpay approve tx_a1b2c3
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `agentpay setup` | One-time interactive setup — passphrase, card details, billing/shipping address |
| `agentpay budget` | View/set spending limits (`--set <amount>`, `--limit-per-tx <amount>`) |
| `agentpay propose` | Create a pending transaction (`--merchant`, `--amount`, `--description`, `--url`) |
| `agentpay pending` | List pending purchase proposals |
| `agentpay approve <txId>` | Approve a purchase (signs an Ed25519 mandate) |
| `agentpay reject <txId>` | Reject a purchase (`--reason` optional) |
| `agentpay status` | Wallet balance, budget, limits, recent transactions |
| `agentpay history` | Full transaction history |
| `agentpay qr` | QR code for web-based setup (`--budget`, `--message`) |
| `agentpay dashboard` | Browser-based GUI (`--port`, default 3141) |
| `agentpay mcp` | Start MCP server (`--http` for HTTP transport) |
| `agentpay reset` | Delete all AgentPay data |

## SDK API

```typescript
import { AgentPay } from '@useagentpay/sdk';

const ap = new AgentPay({
  passphrase: 'your-passphrase',      // optional
  home: '/custom/data/dir',           // optional, default ~/.agentpay
  executor: {
    provider: myCustomProvider,       // optional, defaults to local Chromium
    modelApiKey: process.env.ANTHROPIC_API_KEY,
  },
});
```

### Methods

| Method | Description |
|--------|-------------|
| `ap.status()` | Overall system status |
| `ap.wallet.getBalance()` | Current balance and budget |
| `ap.wallet.getHistory()` | Transaction history |
| `ap.wallet.getLimits()` | Budget and per-tx limits |
| `ap.wallet.generateFundingQR(options?)` | QR code for setup |
| `ap.transactions.propose(options)` | Create a pending transaction |
| `ap.transactions.get(txId)` | Get transaction details |
| `ap.transactions.waitForApproval(txId, options?)` | Long-poll for approval |
| `ap.transactions.requestApproval(txId)` | Open browser approval UI |
| `ap.transactions.execute(txId)` | Execute an approved purchase |
| `ap.transactions.getReceipt(txId)` | Get receipt for completed purchase |
| `ap.audit.getLog()` | Audit log entries |

### Custom Browser Provider

By default, `PurchaseExecutor` runs local Chromium via Playwright + Stagehand. Implement the `BrowserProvider` interface to use a different backend:

```typescript
import { AgentPay, type BrowserProvider } from '@useagentpay/sdk';
import { Stagehand } from '@browserbasehq/stagehand';

const myProvider: BrowserProvider = {
  createStagehand(modelApiKey?: string) {
    return new Stagehand({ env: 'LOCAL', /* ... */ });
  },
  async close() {},
};

const ap = new AgentPay({
  executor: { provider: myProvider },
});
```

## Security Model

- **AES-256-GCM vault** — credentials encrypted with PBKDF2 (SHA-512, 100k iterations), random salt + IV per encryption
- **Placeholder injection** — forms filled with `{{card_number}}` placeholders; real values swapped via atomic `page.evaluate()` at submission time
- **Ed25519 signed mandates** — every purchase requires a cryptographic human approval
- **Browser security boundary** — sensitive operations (setup, approval) open an ephemeral localhost browser window; credentials never pass through the terminal

## Transaction States

```
pending → approved → executing → completed
       ↘ rejected             ↘ failed
```

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `ANTHROPIC_API_KEY` | LLM API key for browser navigation | — |
| `AGENTPAY_HOME` | Override data directory | `~/.agentpay` |
| `AGENTPAY_WEB_URL` | Base URL for QR codes | `http://localhost:3000` |

## Data Directory (`~/.agentpay/`)

| File | Purpose |
|------|---------|
| `credentials.enc` | AES-256-GCM encrypted billing credentials |
| `keys/private.pem` | Ed25519 private key (passphrase-protected) |
| `keys/public.pem` | Ed25519 public key |
| `wallet.json` | Budget, balance, per-tx limit, spent total |
| `transactions.json` | All transactions |
| `audit.log` | Append-only action log |

## License

MIT
