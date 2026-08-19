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
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
