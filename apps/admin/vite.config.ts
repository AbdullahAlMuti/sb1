import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  envDir: "../../",
  server: {
    host: "::",
    port: 3002,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@repo/ui": path.resolve(__dirname, "../../packages/ui/src"),
      "@repo/auth": path.resolve(__dirname, "../../packages/auth/src"),
      "@repo/api-client": path.resolve(__dirname, "../../packages/api-client/src"),
      "@repo/types": path.resolve(__dirname, "../../packages/types/src"),
      "@repo/config": path.resolve(__dirname, "../../packages/config/src"),
      "@repo/utils": path.resolve(__dirname, "../../packages/utils/src"),
      "@repo/marketplace-core": path.resolve(__dirname, "../../packages/marketplace-core/src"),
    },
  },
}));
