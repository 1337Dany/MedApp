import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      // Node's fetch needs an absolute URL; the fake API (src/test/fakeApi.ts) listens here.
      env: { VITE_API_URL: 'http://localhost/api', TZ: 'Europe/Warsaw' },
      // Full-app tests click through several screens.
      testTimeout: 20_000,
    },
  }),
);
