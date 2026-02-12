import { startServer } from '../index.js';

export async function serveCommand(options: { http?: boolean }): Promise<void> {
  await startServer({ http: options.http });
}
