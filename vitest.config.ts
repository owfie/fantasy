import { defineConfig } from 'vitest/config';
import path from 'path';
import { config } from 'dotenv';

// Load .env.local for test environment
config({ path: '.env.local' });

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['lib/__tests__/**/*.test.ts'],
    testTimeout: 30000, // 30 seconds for DB operations
    hookTimeout: 30000,
    teardownTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
