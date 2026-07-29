import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // Browser-backed integration/e2e tests need generous timeouts.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Playwright shares a single browser process; keep suites sequential to
    // avoid contention on constrained CI runners.
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
  },
});
