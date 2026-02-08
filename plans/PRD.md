# Product Requirements Document (PRD)

## Product Name
**AgentPay** — Secure Payments Infrastructure for AI Agents

## Vision
The open standard for agent commerce. Any AI agent can securely purchase anything on the web without ever touching a user's credit card.

## Problem Statement
AI agents are increasingly capable of performing tasks on behalf of users, but there is no secure, standardized way for them to make purchases. Current approaches either expose credit card details to agent code, require per-merchant integrations, or lack human oversight.

## Target Users

### Primary: AI Agent Developers
- Building agents that need to purchase things on behalf of users
- Want a simple SDK (`npm install agentpay`) that handles payments securely
- Need the agent to never see or handle credit card details

### Secondary: End Users (Humans)
- Delegate purchasing tasks to AI agents
- Want control over what gets bought and how much is spent
- Need their financial credentials to remain private and local

## Core Requirements

### R1: Local-First Credential Storage
- All billing credentials (card, name, address, email, phone) stored encrypted on the user's machine
- AES-256-GCM encryption with user-provided passphrase
- Stored at `~/.agentpay/credentials.enc`
- No server, no cloud, no third-party storage

### R2: Agent Cannot See Credentials
- Agent proposes purchases and triggers execution, but credential values never enter agent code
- Credentials flow: local vault -> Browserbase session DOM -> merchant form
- Placeholder injection pattern: forms filled with `{{card_number}}` etc., real values swapped milliseconds before submission

### R3: Human Approval Gate
- Every purchase requires explicit human approval before execution
- User reviews: merchant, amount, description
- User approves or rejects via CLI
- Approval generates a cryptographically signed purchase mandate (see R5)

### R4: Budget Tracking
- User sets a total spending budget (e.g., $200)
- Optional per-transaction limit (e.g., max $50 per purchase)
- Budget is a local counter that decrements on purchases
- Agent cannot modify budget — user-only operation

### R5: Cryptographic Authorization (Inspired by Google AP2)
- At setup, a local Ed25519 keypair is generated (`~/.agentpay/keys/`)
- When user approves a transaction, the transaction details are signed with their private key
- Signed purchase mandate = `{ txDetails, signature, publicKey }`
- Execution only proceeds if the mandate signature is valid
- Prevents: agent forging approvals, replay attacks, tampering

### R6: Browserbase Purchase Execution
- Purchases executed via Browserbase headless browser sessions
- Stagehand (AI-driven browser automation) navigates merchant checkout
- Session recording disabled — no playback of credential entry
- SDK users: AgentPay handles Browserbase. Fork users: must configure their own Browserbase.

### R7: QR Code Wallet Funding
- Agent can generate a QR code linking to a Next.js-hosted setup/funding page
- User scans QR on their phone or computer
- Page guides user through entering credentials and setting budget
- Credentials are encrypted locally — the web page is just a UI for local setup

### R8: Downloadable via npm or curl
- `npm install agentpay` for SDK usage
- `curl -fsSL https://agentpay.dev/install.sh | sh` for CLI usage
- No account creation required to start using

### R9: Full Transparency via API
- Budget, balance, transaction history, pending approvals — all accessible programmatically
- CLI commands for humans: `agentpay status`, `agentpay history`, `agentpay pending`
- SDK methods for agents: `agentpay.wallet.getBalance()`, `agentpay.transactions.get(id)`

## Non-Requirements (Out of Scope for V1)
- Server-side deployment / hosted service
- Multi-user / multi-wallet support
- Python SDK (future)
- Auto-approve rules
- Webhook notifications
- Refund handling
- Mobile app

## Success Metrics
- Agent developer can go from `npm install` to first purchase in under 10 minutes
- Zero credential exposure in agent code paths (verifiable via audit)
- Successful checkout on top 10 e-commerce sites via Stagehand

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Stagehand fails on some merchant checkouts | Start with tested merchant list, expand over time |
| User forgets passphrase | Passphrase is the only key — document clearly that it cannot be recovered |
| Browserbase session intercepted | HTTPS/TLS in transit + recording disabled + placeholder injection |
| Agent submits excessive proposals | Local rate limiting counter |
