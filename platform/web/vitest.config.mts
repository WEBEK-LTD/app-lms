import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` throws outside React Server Components; it's a no-op in unit tests.
      "server-only": fileURLToPath(new URL("./tests/unit/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    env: {
      YALLAPP_DATA: "memory",
      SESSION_SECRET: "test-session-secret-0123456789abcdef0123456789",
      SIGNING_SECRET: "test-signing-secret-0123456789abcdef0123456789",
      ENCRYPTION_KEY: "0".repeat(64),
    },
  },
});
