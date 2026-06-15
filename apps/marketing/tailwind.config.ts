import type { Config } from "tailwindcss";
import sharedConfig from "../../tailwind.config";

const config: Config = {
  ...sharedConfig,
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/**/*.{ts,tsx}",
  ],
  // Marketing needs the typography plugin for blog article (`prose`) styling,
  // on top of the shared `tailwindcss-animate` plugin.
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};

export default config;
