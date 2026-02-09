# Contributing to AgentPay

## Setup

```bash
git clone <repo-url>
cd agentpay
pnpm install
```

## Development

```bash
pnpm build        # Build all packages
pnpm typecheck    # Type-check all packages
pnpm test         # Run all tests
pnpm dev          # Dev mode with watch
```

## Project Structure

- `packages/sdk/` - Core SDK (published as `@useagentpay/sdk` on npm)
- `packages/web/` - Next.js setup page
- `examples/basic/` - Minimal agent example
- `examples/mcp/` - MCP tool definition example

## Making Changes

1. Create a feature branch
2. Make your changes
3. Run `pnpm typecheck && pnpm test` to verify
4. Create a changeset: `pnpm changeset`
5. Open a pull request

## Changesets

We use [changesets](https://github.com/changesets/changesets) for versioning. When making a user-facing change, run `pnpm changeset` and follow the prompts to describe the change.

## Code Style

- TypeScript strict mode
- ESM imports with `.js` extensions
- Co-located tests (`*.test.ts` next to source files)
- Pure `node:crypto` for all cryptographic operations

## License

MIT
