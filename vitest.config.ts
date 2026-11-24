import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/integration/**"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/index.ts",
        "src/bot/index.ts",
        "src/bot/types.ts",
        "src/utils/logger.ts",
        "src/integrations/firestore/index.ts",
        "src/integrations/firestore/client.ts",
        "src/integrations/forms/index.ts",
      ],
      thresholds: {
        lines: 95,
        branches: 95,
        functions: 90,
        statements: 95,
      },
    },
  },
});
