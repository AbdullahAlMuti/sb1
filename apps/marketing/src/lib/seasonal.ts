import { useEffect, useState } from "react";
import type { SeasonalCampaign } from "@/config/types";

/**
 * Campaign is active when the flag is on AND the end date hasn't passed.
 * An invalid/missing end date is treated as "no expiry" so a campaign with
 * only `{ active: true }` still counts as active (used in unit checks).
 */
export function isCampaignActive(campaign: SeasonalCampaign, now: Date = new Date()): boolean {
  if (!campaign.active) return false;
  const end = new Date(campaign.endDate).getTime();
  if (!Number.isFinite(end)) return true;
  return end > now.getTime();
}

export interface SeasonalPrice {
  /** Price to charge/display after any seasonal discount. */
  final: number;
  /** Original price to show struck-through, or null when no discount applies. */
  compareAt: number | null;
}

/** Apply the campaign discount to an amount. Rounds to cents. */
export function applySeasonalPricing(amount: number, campaign: SeasonalCampaign): SeasonalPrice {
  if (!isCampaignActive(campaign) || !campaign.discountPct) {
    return { final: amount, compareAt: null };
  }
  const final = Math.round(amount * (1 - campaign.discountPct / 100) * 100) / 100;
  return { final, compareAt: amount };
}

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function computeCountdown(endDate: string, now: number): Countdown {
  const end = new Date(endDate).getTime();
  const diff = end - now;
  if (!Number.isFinite(end) || diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  const seconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
    expired: false,
  };
}

/** Live countdown to an ISO end date, ticking every second. */
export function useCountdown(endDate: string): Countdown {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return computeCountdown(endDate, now);
}
