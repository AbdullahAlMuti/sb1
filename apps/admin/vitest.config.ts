import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@repo/ui": path.resolve(__dirname, "../../packages/ui/src"),
      "@repo/auth": path.resolve(__dirname, "../../packages/auth/src"),
      "@repo/api-client": path.resolve(__dirname, "../../packages/api-client/src"),
      "@repo/types": path.resolve(__dirname, "../../packages/types/src"),
      "@repo/config": path.resolve(__dirname, "../../packages/config/src"),
      "@repo/utils": path.resolve(__dirname, "../../packages/utils/src"),
    },
  },
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
