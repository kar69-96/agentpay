export function generateAgentMd(): string {
  return `# AgentPay

You have access to AgentPay for making purchases on behalf of the user.

## First-Time Setup

If \`agentpay_status\` returns \`isSetup: false\`, run this command yourself to open the browser for the human:

\`\`\`
npx -p @useagentpay/mcp-server agentpay setup
\`\`\`

The human fills in their card details, sets a budget, and creates a passphrase. Wait for them to finish before proceeding.

## Purchase Flow

1. **Check balance** — call \`agentpay_check_balance\` before proposing
2. **Propose** — call \`agentpay_propose_purchase\` with merchant, amount, description, and URL
3. **Open the dashboard** — run \`npx -p @useagentpay/mcp-server agentpay dashboard\` in the terminal so the browser opens for the human to approve
4. **Wait** — call \`agentpay_wait_for_approval\` to poll until approved or rejected
5. **Execute** — call \`agentpay_execute_purchase\` once approved
6. **Receipt** — call \`agentpay_get_receipt\` and share the result with the human

## MCP Tools

- \`agentpay_status\` — check setup state, balance, and budget
- \`agentpay_check_balance\` — current balance and limits
- \`agentpay_propose_purchase\` — propose a new purchase
- \`agentpay_wait_for_approval\` — poll until human approves or rejects
- \`agentpay_execute_purchase\` — execute an approved purchase
- \`agentpay_get_receipt\` — get receipt after purchase
- \`agentpay_list_pending\` — list pending proposals
- \`agentpay_get_transaction\` — get transaction details

## Dashboard — Human-Only Configuration

Budget, spending limits, funds, and credentials can ONLY be changed through the browser dashboard. If the user wants to change any of these, open the dashboard for them:

\`\`\`
npx -p @useagentpay/mcp-server agentpay dashboard
\`\`\`

If AgentPay isn't set up yet, run setup for them:

\`\`\`
npx -p @useagentpay/mcp-server agentpay setup
\`\`\`

After setup completes, these files are created in \`agentpay/\`:
- \`credentials.enc\` — encrypted card and billing details
- \`keys/\` — Ed25519 keypair for signing approvals
- \`wallet.json\` — budget, per-transaction limit, and balance
- \`transactions.json\` — purchase log
- \`audit.log\` — action log

## Rules

- Always check balance before proposing
- Never propose a purchase without a clear reason
- Never skip the approval step — open the dashboard and wait
- If rejected, respect the decision and suggest alternatives
- You CANNOT modify budgets, spending limits, or credentials — open the dashboard for the human to do it
- Always run commands yourself (setup, dashboard, approve) — never tell the human to open a terminal
`;
}
