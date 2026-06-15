import { useEffect, useState } from "react";
import { Timer, X } from "lucide-react";
import { motion } from "framer-motion";
import { themeConfig } from "@/config/themeConfig";
import { isCampaignActive, useCountdown } from "@/lib/seasonal";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { track } from "@/lib/analytics";

const DISMISS_KEY = "ss_seasonal_dismissed";
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Thin top banner for the seasonal campaign. Renders nothing unless the
 * campaign is active (and not expired/dismissed). Generic tournament theme —
 * no FIFA/World Cup marks. Stadium-light sweep + live countdown to endDate.
 */
export function SeasonalBanner() {
  const campaign = themeConfig.seasonalCampaign;
  const reduced = useReducedMotion();
  const countdown = useCountdown(campaign.endDate);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      /* sessionStorage may be unavailable */
    }
  }, []);

  if (!isCampaignActive(campaign) || countdown.expired || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    track("seasonal_banner_dismiss");
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const handleCta = (e: React.MouseEvent) => {
    track(campaign.cta.event, { href: campaign.cta.href });
    if (campaign.cta.href.startsWith("#")) {
      e.preventDefault();
      document.querySelector(campaign.cta.href)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const accentGradient = `linear-gradient(90deg, ${campaign.accentColors.join(", ")})`;

  return (
    <div className="relative isolate overflow-hidden bg-foreground text-background">
      {/* flag-color accent line */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: accentGradient }} />

      {/* stadium-light sweep */}
      {!reduced && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{ x: ["0%", "440%"] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
        />
      )}

      <div className="container relative flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-10 py-2 text-center text-xs sm:text-sm">
        <span className="font-semibold">⚽ {campaign.label}</span>
        <span className="hidden text-background/80 sm:inline">{campaign.bannerText}</span>
        <span className="inline-flex items-center gap-1.5 font-mono tabular-nums text-background/90">
          <Timer className="h-3.5 w-3.5" />
          {countdown.days}d {pad(countdown.hours)}:{pad(countdown.minutes)}:{pad(countdown.seconds)}
        </span>
        <a
          href={campaign.cta.href}
          onClick={handleCta}
          className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-foreground transition-transform hover:scale-105"
        >
          {campaign.cta.label}
        </a>
      </div>

      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss banner"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-background/70 transition-colors hover:bg-background/10 hover:text-background"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default SeasonalBanner;
