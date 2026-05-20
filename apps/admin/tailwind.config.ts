import sharedConfig from "../../tailwind.config";
import type { Config } from "tailwindcss";

export default {
  presets: [sharedConfig],
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/**/*.{ts,tsx}",
  ],
} satisfies Config;
