# File Structure

Monorepo using `pnpm` workspaces. Organized by domain, not by layer.

```
agentpay/
│
├── packages/
│   │
│   ├── sdk/                              # @agentpay/sdk — core SDK + CLI
│   │   ├── package.json
│   │   ├── tsup.config.ts                # Build config (CJS + ESM)
│   │   ├── vitest.config.ts
│   │   ├── README.md
│   │   └── src/
│   │       ├── index.ts                  # Public API exports
│   │       ├── cli.ts                    # CLI entry point (commander)
│   │       │
│   │       ├── vault/                    # Credential encryption/decryption
│   │       │   ├── vault.ts              # AES-256-GCM encrypt/decrypt
│   │       │   ├── vault.test.ts
│   │       │   └── types.ts              # BillingCredentials interface
│   │       │
│   │       ├── auth/                     # Keypair + purchase mandates
│   │       │   ├── keypair.ts            # Ed25519 key generation
│   │       │   ├── mandate.ts            # Sign & verify purchase mandates
│   │       │   ├── mandate.test.ts
│   │       │   └── types.ts              # Mandate, Signature interfaces
│   │       │
│   │       ├── budget/                   # Wallet & spending limits
│   │       │   ├── budget.ts             # Read/write wallet.json
│   │       │   ├── budget.test.ts
│   │       │   └── types.ts              # Wallet, Budget interfaces
│   │       │
│   │       ├── transactions/             # Transaction lifecycle
│   │       │   ├── manager.ts            # Propose, approve, reject, execute
│   │       │   ├── manager.test.ts
│   │       │   ├── poller.ts             # waitForApproval() polling logic
│   │       │   └── types.ts              # Transaction, Receipt interfaces
│   │       │
│   │       ├── executor/                 # Browserbase + Stagehand checkout
│   │       │   ├── executor.ts           # Session management, form filling
│   │       │   ├── placeholder.ts        # Placeholder injection + atomic swap
│   │       │   ├── executor.test.ts
│   │       │   └── types.ts              # Session, CheckoutResult interfaces
│   │       │
│   │       ├── commands/                 # CLI command handlers
│   │       │   ├── setup.ts              # agentpay setup
│   │       │   ├── budget.ts             # agentpay budget
│   │       │   ├── approve.ts            # agentpay approve
│   │       │   ├── reject.ts             # agentpay reject
│   │       │   ├── pending.ts            # agentpay pending
│   │       │   ├── status.ts             # agentpay status
│   │       │   └── history.ts            # agentpay history
│   │       │
│   │       ├── audit/                    # Audit logging
│   │       │   └── logger.ts             # Append-only audit log
│   │       │
│   │       └── utils/                    # Shared helpers
│   │           ├── paths.ts              # ~/.agentpay/ path resolution
│   │           ├── ids.ts                # Transaction ID generation
│   │           └── display.ts            # CLI output formatting
│   │
│   └── web/                              # @agentpay/web — Next.js setup page
│       ├── package.json
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       ├── README.md
│       └── src/
│           ├── app/
│           │   ├── layout.tsx
│           │   ├── page.tsx              # Landing / QR display
│           │   └── setup/
│           │       └── page.tsx          # Credential entry form
│           ├── components/
│           │   ├── QRCode.tsx            # QR code display
│           │   ├── SetupForm.tsx         # Credential entry form
│           │   ├── BudgetSlider.tsx      # Budget amount selector
│           │   └── SuccessScreen.tsx     # Setup confirmation
│           └── lib/
│               └── encrypt.ts            # Client-side AES-256-GCM (same as SDK)
│
├── examples/
│   ├── basic/                            # Minimal agent usage example
│   │   ├── package.json
│   │   ├── README.md
│   │   └── src/
│   │       └── agent.ts                  # Simple propose → approve → execute
│   │
│   └── mcp/                              # MCP skill integration example
│       ├── package.json
│       ├── README.md
│       └── src/
│           └── skill.ts                  # AgentPay as MCP tool
│
├── docs/                                 # Documentation
│   ├── PRD.md                            # Product requirements
│   ├── TECH_STACK.md                     # Technology choices
│   ├── USER_FLOW.md                      # Step-by-step user journeys
│   ├── SECURITY.md                       # Security architecture
│   ├── ARCHITECTURE.md                   # System design
│   ├── FILE_STRUCTURE.md                 # This file
│   └── API_REFERENCE.md                  # SDK + CLI reference
│
├── scripts/
│   └── install.sh                        # curl installer script
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                        # Lint + typecheck + test
│   │   └── release.yml                   # Publish to npm via changesets
│   └── PULL_REQUEST_TEMPLATE.md
│
├── package.json                          # Workspace root
├── pnpm-workspace.yaml                   # pnpm monorepo config
├── turbo.json                            # Turbo build orchestration
├── tsconfig.json                         # Root TypeScript config
├── README.md                             # Project overview (brief)
├── CONTRIBUTING.md                       # Contributor guide
├── LICENSE                               # MIT
└── .changeset/                           # Changesets for versioning
```

## Design Decisions

### Why monorepo?
- SDK and web share encryption logic (vault)
- Coordinated versioning and releases
- Single CI/CD pipeline

### Why organized by domain (not by layer)?
```
# YES — organized by domain
src/vault/        # everything about credential encryption
src/auth/         # everything about keypair + mandates
src/budget/       # everything about wallet + limits
src/transactions/ # everything about transaction lifecycle
src/executor/     # everything about Browserbase checkout

# NO — organized by layer (harder to navigate)
src/models/
src/services/
src/utils/
src/types/
```

Each domain folder is self-contained: implementation, tests, and types co-located.

### Why co-located tests?
- `vault.ts` and `vault.test.ts` live in the same folder
- Easy to find, easy to maintain
- Follows Vercel AI SDK and modern TypeScript conventions
