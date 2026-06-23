import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,

    // Test file naming convention: every test lives under tests/ and ends in .test.js / .spec.js.
    include: ["tests/**/*.{test,spec}.js"],

    // Test isolation: run each test file in its own worker thread, in parallel.
    pool: "threads",
    poolOptions: {
      threads: { isolate: true, singleThread: false }
    },
    fileParallelism: true,

    // Flaky test handling: retry a failing test before reporting it as failed.
    retry: 2,

    // Test performance tracking: verbose reporter prints per-test durations and
    // anything slower than the threshold (ms) is flagged.
    reporters: ["verbose"],
    slowTestThreshold: 300,

    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "json-summary", "html"],
      include: ["src/**/*.js"],
      // Minimum coverage enforced; the suite fails below these thresholds.
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    }
  }
});
