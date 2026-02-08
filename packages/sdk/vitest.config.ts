import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    passWithNoTests: true,
    exclude: ['**/node_modules/**', '**/dist/**', ...(process.env.RUN_INTEGRATION ? [] : ['**/__integration__/**'])],
  },
});
