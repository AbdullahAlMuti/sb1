import type { Config } from "tailwindcss";
import sharedConfig from "../../tailwind.config";

const config: Config = {
  ...sharedConfig,
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/**/*.{ts,tsx}",
  ],
};

export default config;
