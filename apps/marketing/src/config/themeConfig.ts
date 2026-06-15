import type { ThemeConfig } from "./types";

/**
 * Theme + seasonal campaign config.
 *
 * Flip `seasonalCampaign.active` (and ONLY that) to switch the entire site
 * between normal and campaign mode: the top banner appears/disappears and
 * pricing switches between normal and discounted automatically.
 *
 * LEGAL: the seasonal theme is a GENERIC football/tournament season.
 * Do NOT add FIFA / "World Cup" wordmarks, the trophy, team names, crests,
 * or official logos. Generic football imagery + flag-color accents only.
 */
export const themeConfig: ThemeConfig = {
  seasonalCampaign: {
    active: true,
    theme: "tournament-season",
    label: "Tournament Season Sale",
    bannerText: "The season's biggest sale is live — 25% off Starter & Pro.",
    discountPct: 25,
    endDate: "2026-07-15T23:59:59Z",
    // Generic flag-color accents (no team/tournament affiliation).
    accentColors: ["#16a34a", "#f59e0b", "#dc2626", "#2563eb"],
    cta: { label: "Claim the deal", href: "#pricing", event: "cta_seasonal_banner" },
  },
};

export default themeConfig;
