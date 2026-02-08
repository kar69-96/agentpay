# Tech Stack

## Language & Runtime
- **TypeScript** — primary language for SDK, CLI, and web components
- **Node.js (ESM)** — runtime for SDK and CLI
- **Next.js** — web framework for QR code funding page / setup UI

## Build & Development
| Tool | Purpose |
|---|---|
| `tsup` | Build SDK (dual CJS + ESM output) |
| `tsx` | Dev-time TypeScript execution |
| `tsc --noEmit` | Type checking |
| `pnpm` | Package manager (monorepo workspaces) |
| `turbo` | Monorepo build orchestration |
| `vitest` | Testing |
| `changesets` | Versioning and npm publishing |

## Core Dependencies

### SDK (`@agentpay/sdk`)
| Package | Purpose |
|---|---|
| `commander` | CLI framework (setup, approve, reject, status) |
| `@browserbasehq/stagehand` | AI-driven browser automation for merchant checkout |
| `crypto` (Node built-in) | AES-256-GCM encryption, Ed25519 keypair signing |
| `qrcode` | QR code generation for wallet funding links |

### Web (`@agentpay/web`)
| Package | Purpose |
|---|---|
| `next` | React framework for setup/funding page |
| `react` / `react-dom` | UI |
| `tailwindcss` | Styling |
| `qrcode.react` | QR code rendering in browser |

## External Services

### Browserbase
- Headless browser infrastructure for executing purchases
- Stagehand runs inside Browserbase sessions
- **SDK users**: AgentPay manages Browserbase sessions (requires `BROWSERBASE_API_KEY` and `BROWSERBASE_PROJECT_ID`)
- **Fork users**: Must set up their own Browserbase account

### No Other External Services
- No database (local JSON files)
- No auth service (local keypair)
- No payment processor (card charged directly by merchant at checkout)
- No cloud storage (all data in `~/.agentpay/`)

## Local Data Storage

All data stored at `~/.agentpay/`:

```
~/.agentpay/
├── credentials.enc        # AES-256-GCM encrypted billing credentials
├── keys/
│   ├── private.pem        # Ed25519 private key (passphrase-protected)
│   └── public.pem         # Ed25519 public key
├── wallet.json            # Budget, balance, limits
├── transactions.json      # Transaction history & pending proposals
└── audit.log              # Append-only log of all actions
```

## Encryption & Signing

| Operation | Algorithm | Purpose |
|---|---|---|
| Credential encryption | AES-256-GCM | Encrypt card/billing details at rest |
| Key derivation | PBKDF2 (SHA-512, 100k iterations) | Derive encryption key from user passphrase |
| Transaction signing | Ed25519 | Cryptographic proof of human approval |
| Hashing | SHA-256 | Transaction detail hashing for mandate |

## Monorepo Structure

```
agentpay/
├── packages/
│   ├── sdk/          # @agentpay/sdk — core SDK + CLI
│   └── web/          # @agentpay/web — Next.js setup/funding page
├── examples/
│   ├── basic/        # Minimal agent usage
│   └── mcp/          # MCP skill integration
├── docs/             # Documentation
└── scripts/          # Build & release scripts
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `BROWSERBASE_API_KEY` | Yes (SDK users) | — | Browserbase API key |
| `BROWSERBASE_PROJECT_ID` | Yes (SDK users) | — | Browserbase project ID |
| `AGENTPAY_HOME` | No | `~/.agentpay` | Override default data directory |
