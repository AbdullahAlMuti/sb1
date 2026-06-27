import { PlatformDefinition } from "./types";
import { ebayPlatform } from "./ebay";
import { shopifyPlatform } from "./shopify";

export const platformRegistry: PlatformDefinition[] = [
  ebayPlatform,
  shopifyPlatform,
].filter((p) => p.enabled);
