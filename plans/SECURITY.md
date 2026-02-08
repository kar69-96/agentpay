# Security Architecture

## Threat Model

AgentPay assumes the following threat landscape:

| Threat | Description |
|---|---|
| **Malicious agent** | Agent code attempts to exfiltrate credit card details |
| **Session observer** | Someone views a Browserbase session during checkout |
| **Forged approval** | Agent fabricates a user approval to execute an unauthorized purchase |
| **Replay attack** | A valid approval is reused for a different transaction |
| **Data breach** | Attacker gains access to `~/.agentpay/` directory |
| **Man-in-the-middle** | Interception of data between local machine and Browserbase |

## Three-Layer Credential Protection

### Layer 1: Local Encrypted Vault

All billing credentials are stored in `~/.agentpay/credentials.enc`.

**Encryption scheme:**
- Algorithm: AES-256-GCM (authenticated encryption)
- Key derivation: PBKDF2 with SHA-512, 100,000 iterations, random salt
- Passphrase: user-provided, never stored
- IV: randomly generated per encryption operation

**What's stored:**
```
{
  card: { number, expiry, cvv },
  name: "...",
  billingAddress: { street, city, state, zip, country },
  shippingAddress: { street, city, state, zip, country },
  email: "...",
  phone: "..."
}
```

**Guarantees:**
- Without the passphrase, the file is indistinguishable from random data
- AES-GCM provides both confidentiality and integrity (tamper detection)
- Salt prevents rainbow table attacks
- 100k PBKDF2 iterations resist brute-force

### Layer 2: Browserbase Recording Disabled

When AgentPay creates a Browserbase session for checkout:
- `recording: false` is set on session creation
- No screenshots are captured
- No session replay is available
- No visual logs of the checkout process exist
- Session is terminated immediately after purchase completes

### Layer 3: Placeholder Injection Pattern

During checkout, Stagehand fills form fields with masked placeholders:

```
Card Number:      {{card_number}}
Cardholder Name:  {{cardholder_name}}
Expiry:           {{card_expiry}}
CVV:              {{card_cvv}}
Billing Address:  {{billing_address}}
Shipping Address: {{shipping_address}}
Email:            {{email}}
Phone:            {{phone}}
```

At the moment of form submission, a single atomic `page.evaluate()` call:
1. Replaces all placeholders with real values from decrypted credentials
2. Immediately submits the form

Real values exist in the DOM for **milliseconds**. Even with a live session view, they are not human-readable.

## Cryptographic Authorization (Purchase Mandates)

Inspired by [Google AP2](https://github.com/google-agentic-commerce/AP2).

### Problem
How do you prove a real human approved a specific transaction?

### Solution: Signed Purchase Mandates

At setup, an Ed25519 keypair is generated:
- Private key: `~/.agentpay/keys/private.pem` (passphrase-protected)
- Public key: `~/.agentpay/keys/public.pem`

When the user approves a transaction:

```
1. Transaction details hashed:
   SHA-256({ txId, merchant, amount, description, timestamp })

2. User enters passphrase to unlock private key

3. Hash signed with Ed25519 private key

4. Mandate stored alongside transaction:
   { txId, txHash, signature, publicKey, timestamp }
```

When the agent calls `execute(txId)`:

```
1. Load mandate for txId
2. Recompute hash from stored transaction details
3. Verify signature against public key
4. If valid → proceed with Browserbase checkout
5. If invalid → reject execution with AUTH_FAILED error
```

### What This Prevents

| Attack | How It's Prevented |
|---|---|
| **Agent forges approval** | Can't sign without user's private key + passphrase |
| **Replay attack** | Each mandate is tied to a unique txId + timestamp |
| **Tampering** | Changing any detail (amount, merchant) invalidates the signature |
| **Unauthorized execution** | `execute()` checks mandate validity before proceeding |

## Budget Security

- Budget stored in `~/.agentpay/wallet.json`
- Only modifiable via `agentpay setup` or `agentpay budget` CLI (requires user interaction)
- SDK exposes read-only budget methods to agents
- Execution checks remaining balance before proceeding
- Per-transaction limits enforced at proposal time

## Data Flow Diagram

```
User enters credentials (CLI/Web)
        │
        ▼
Encrypted with AES-256-GCM (user passphrase)
        │
        ▼
Stored at ~/.agentpay/credentials.enc
        │
        │  (at checkout time only)
        ▼
Decrypted in memory (passphrase cached for session)
        │
        ▼
Passed to page.evaluate() over HTTPS/TLS
        │
        ▼
Replaces {{placeholders}} in merchant form DOM
        │
        ▼
Form submitted → merchant charges card
        │
        ▼
Session destroyed, credentials cleared from memory
        │
        ▼
Agent receives: receipt only (no credentials)
```

## File Permissions

```bash
~/.agentpay/
├── credentials.enc    # 600 (owner read/write only)
├── keys/
│   ├── private.pem    # 600 (owner read/write only)
│   └── public.pem     # 644 (world readable — it's a public key)
├── wallet.json        # 600
├── transactions.json  # 600
└── audit.log          # 600
```

## Audit Log

Every action is appended to `~/.agentpay/audit.log`:

```
2026-02-08T10:30:00Z  SETUP       credentials encrypted
2026-02-08T10:31:00Z  BUDGET_SET  amount=200.00 limit_per_tx=50.00
2026-02-08T11:00:00Z  PROPOSE     tx_a1b2c3 amazon.com $29.99
2026-02-08T11:05:00Z  APPROVE     tx_a1b2c3 mandate_signed
2026-02-08T11:05:30Z  EXECUTE     tx_a1b2c3 browserbase_session_started
2026-02-08T11:06:00Z  COMPLETE    tx_a1b2c3 confirmation=AMZ-12345
```
