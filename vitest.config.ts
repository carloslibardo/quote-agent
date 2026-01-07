import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    setupFiles: ["src/__tests__/setup.ts"],
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/mastra/**/*.ts"],
      exclude: ["src/__tests__/**", "src/**/*.d.ts"],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

