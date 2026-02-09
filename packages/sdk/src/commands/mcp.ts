export async function mcpCommand(options: { http?: boolean }) {
  try {
    // @ts-expect-error — optional peer dependency, may not be installed
    const { startServer } = await import('@agentpay/mcp-server');
    await (startServer as (opts: { http?: boolean }) => Promise<void>)({ http: options.http });
  } catch (err) {
    if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ERR_MODULE_NOT_FOUND') {
      console.error('MCP server package not installed.');
      console.error('Run: pnpm add @agentpay/mcp-server');
      process.exit(1);
    }
    throw err;
  }
}
