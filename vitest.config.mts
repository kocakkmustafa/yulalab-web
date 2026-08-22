import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  // Component tests are .tsx. An esbuild jsx option is not enough here:
  // tsconfig.json sets `jsx: "preserve"` (Next.js compiles JSX itself), vite
  // honours that, and the file reaches import-analysis as raw JSX.
  plugins: [react()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    // Eight suites open real PostgreSQL pools while the remaining files can
    // also exercise jsdom and route handlers. Letting Vitest mirror a large
    // host CPU count oversubscribes those pools and turns 5-second flood tests
    // into machine-dependent timeouts; four workers retains file isolation
    // while keeping the standard local and CI command deterministic.
    maxWorkers: 4,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
