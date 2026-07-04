import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      'bajo-automata-core': path.resolve(__dirname, './packages/bajo-automata-core/src'),
    },
  },
  test: {
    include: ['packages/**/tests/**/*.test.ts', 'src/**/*.test.ts'],
  },
});
