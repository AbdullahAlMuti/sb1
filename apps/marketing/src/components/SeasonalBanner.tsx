import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import { themeConfig } from "@/config/themeConfig";
import { isCampaignActive, useCountdown } from "@/lib/seasonal";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { track } from "@/lib/analytics";
import type { HpAnnouncement } from "@repo/types";

const DISMISS_KEY = "ss_seasonal_dismissed";

/**
 * Full-width announcement bar above the nav.
 * Accepts optional `announcement` prop so the homepage can wire it to DB
 * content while other pages fall back to themeConfig defaults.
 *
 * ── PRESERVED LOGIC (unchanged) ──────────────────────────────────────────
 *  - dismiss() / persistence: sessionStorage key "ss_seasonal_dismissed"
 *  - visibility: !isCampaignActive(campaign) || countdown.expired || dismissed
 *  - handleCta: fires analytics + smooth-scrolls hash links
 * ─────────────────────────────────────────────────────────────────────────
 * Only className/markup/motion changed from the previous version.
 */
export function SeasonalBanner({ announcement }: { announcement?: HpAnnouncement }) {
  const campaign = themeConfig.seasonalCampaign;
  const reduced = useReducedMotion();
  const countdown = useCountdown(campaign.endDate);
  const [dismissed, setDismissed] = useState(false);

  // ── Preserved: dismiss persistence via sessionStorage ──────────────────
  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      /* sessionStorage may be unavailable */
    }
  }, []);

  // ── Preserved: visibility condition ────────────────────────────────────
  if (!isCampaignActive(campaign) || countdown.expired || dismissed) return null;

  // ── Preserved: dismiss handler ──────────────────────────────────────────
  const dismiss = () => {
    setDismissed(true);
    track("seasonal_banner_dismiss");
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  // ── Preserved: CTA link resolver ───────────────────────────────────────
  const handleCta = (e: React.MouseEvent) => {
    track(campaign.cta.event, { href: campaign.cta.href });
    if (campaign.cta.href.startsWith("#")) {
      e.preventDefault();
      document.querySelector(campaign.cta.href)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // ── Content: prefer DB announcement prop, fall back to themeConfig ──────
  const message     = announcement?.message     ?? campaign.bannerText;
  const linkLabel   = announcement?.link.label  ?? campaign.cta.label;
  const linkHref    = announcement?.link.href   ?? campaign.cta.href;
  const colors      = announcement?.accentColors ?? campaign.accentColors;

  const accentGradient = colors.length
    ? `linear-gradient(90deg, ${colors.join(", ")})`
    : `linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))`;

  // ── Markup/classes/motion changed below ─────────────────────────────────
  return (
    <div
      role="banner"
      className="relative isolate overflow-hidden"
      style={{ background: `linear-gradient(135deg, #0f172a 0%, #1e293b 100%)` }}
    >
      {/* Gradient accent line at top */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: accentGradient }}
      />

      {/* Subtle gradient overlay using accent colors */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{ background: accentGradient }}
      />

      {/* Stadium-light sweep — logic unchanged, classes only changed */}
      {!reduced && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          animate={{ x: ["0%", "440%"] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
        />
      )}

      <div className="container relative flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-10 py-2.5 text-center">
        {/* Message */}
        <p className="text-xs font-medium text-white/90 sm:text-sm">
          {message}
        </p>

        {/* Inline "Learn more" link */}
        <a
          href={linkHref}
          onClick={handleCta}
          className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-0.5 text-xs font-semibold text-white transition-all hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {linkLabel}
        </a>
      </div>

      {/* Dismiss button */}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss banner"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default SeasonalBanner;
