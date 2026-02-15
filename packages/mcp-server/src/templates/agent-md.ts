export function generateAgentMd(): string {
  return `# AgentPay

You have access to AgentPay for making purchases on behalf of the user.

## First-Time Setup

If \`agentpay_status\` returns \`isSetup: false\`, run this command yourself to open the browser for the human:

\`\`\`
npx -p @useagentpay/mcp-server agentpay setup
\`\`\`

The human fills in their card details, sets a budget, and creates a passphrase. Wait for them to finish before proceeding.

## Mobile Mode

Check \`agentpay_status\` — if \`mobileMode: true\`, approval links are sent to the user's phone via Cloudflare Tunnel instead of opening a local browser.

To toggle mobile mode:
\`\`\`
npx -p @useagentpay/mcp-server agentpay mobile on
npx -p @useagentpay/mcp-server agentpay mobile off
\`\`\`

To set a notification method (how the approval link reaches the user's phone):
\`\`\`
npx -p @useagentpay/mcp-server agentpay mobile on --notify-command "your-command {{url}}"
npx -p @useagentpay/mcp-server agentpay mobile on --notify-webhook "https://hooks.example.com/notify"
\`\`\`

## Purchase Flow

1. **Check balance** — call \`agentpay_check_balance\` before proposing
2. **Propose** — call \`agentpay_propose_purchase\` with merchant, amount, description, and URL
3. **Get approval** — check \`mobileMode\` in the response:
   - **mobileMode: false** — run \`npx -p @useagentpay/mcp-server agentpay dashboard\` to open the browser for the human
   - **mobileMode: true** — call \`agentpay_request_mobile_approval\` to tunnel a secure approval link to their phone
4. **Wait** — call \`agentpay_wait_for_approval\` to poll until approved or rejected
5. **Execute** — call \`agentpay_execute_purchase\` once approved
6. **Receipt** — call \`agentpay_get_receipt\` and share the result with the human

## MCP Tools

- \`agentpay_status\` — check setup state, balance, budget, and mobileMode
- \`agentpay_check_balance\` — current balance and limits
- \`agentpay_propose_purchase\` — propose a new purchase
- \`agentpay_request_mobile_approval\` — tunnel a secure approval link to the user's phone (mobile mode)
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
- \`config.json\` — mobile mode and notification settings
- \`transactions.json\` — purchase log
- \`audit.log\` — action log

## Rules

- Always check balance before proposing
- Never propose a purchase without a clear reason
- Never skip the approval step — open the dashboard (or send mobile link) and wait
- If rejected, respect the decision and suggest alternatives
- You CANNOT modify budgets, spending limits, or credentials — open the dashboard for the human to do it
- Always run commands yourself (setup, dashboard, mobile) — never tell the human to open a terminal
- Check \`mobileMode\` from status to decide approval method — don't assume
`;
}
