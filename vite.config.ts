import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      'bajo-automata-core': path.resolve(__dirname, './packages/bajo-automata-core/src'),
    },
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
});
