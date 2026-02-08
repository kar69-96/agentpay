# AgentPay

> Secure payments infrastructure for AI agents.


AgentPay lets AI agents purchase things on the web without ever seeing a user's credit card. Credentials are encrypted locally, purchases require human approval with cryptographic signatures, and checkout happens via headless browser with placeholder injection — real values exist in the DOM for milliseconds.

Everything runs on the user's machine except for CUA running on Browserbase.

## Install

```bash
npm install agentpay
```

## Quick Start

**Human — set up credentials:**
```bash
agentpay setup       # encrypt & store billing credentials locally
agentpay budget --set 200
```

**Agent — propose & execute:**
```typescript
import { AgentPay } from 'agentpay';
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
3. Browserbase session fills checkout with `{{placeholders}}`
4. Real values swapped in milliseconds before form submission — agent never sees them
5. Agent gets a receipt. That's it.

## Security

- **Credentials never leave your machine** except encrypted in transit to Browserbase at checkout
- **Placeholder injection** — forms show `{{card_number}}` until the instant of submission
- **Signed purchase mandates** — Ed25519 proof that a real human approved each transaction (inspired by [Google AP2](https://github.com/google-agentic-commerce/AP2))
- **Recording disabled** — no Browserbase session playback
- **Open source** — audit the entire security model

## Docs

| Doc | Description |
|---|---|
| [PRD](docs/PRD.md) | Product requirements |
| [Architecture](docs/ARCHITECTURE.md) | System design |
| [Security](docs/SECURITY.md) | Security model deep dive |
| [User Flow](docs/USER_FLOW.md) | Step-by-step journeys |
| [API Reference](docs/API_REFERENCE.md) | SDK + CLI reference |
| [Tech Stack](docs/TECH_STACK.md) | Technology choices |
| [File Structure](docs/FILE_STRUCTURE.md) | Repo organization |

## Browserbase

- **SDK users**: AgentPay handles Browserbase. Set `BROWSERBASE_API_KEY` and `BROWSERBASE_PROJECT_ID`.
- **Fork users**: Set up your own Browserbase account.

## License

MIT
