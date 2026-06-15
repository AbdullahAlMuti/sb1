/**
 * Provider-agnostic analytics shim. Every CTA on the homepage fires through
 * `track()`. It forwards to whatever provider is present on `window`
 * (GA4 `gtag`, GTM `dataLayer`, or Plausible) and is a safe no-op otherwise.
 * Never throws — analytics must never break the page.
 */
export type TrackProps = Record<string, unknown>;

interface AnalyticsWindow {
  gtag?: (command: string, eventName: string, params?: TrackProps) => void;
  dataLayer?: unknown[];
  plausible?: (event: string, options?: { props?: TrackProps }) => void;
}

export function track(event: string, props: TrackProps = {}): void {
  try {
    if (typeof window === "undefined") return;
    const w = window as unknown as AnalyticsWindow;

    if (typeof w.gtag === "function") {
      w.gtag("event", event, props);
    }
    if (Array.isArray(w.dataLayer)) {
      w.dataLayer.push({ event, ...props });
    }
    if (typeof w.plausible === "function") {
      w.plausible(event, { props });
    }
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug("[analytics]", event, props);
    }
  } catch {
    /* analytics is best-effort; never throw */
  }
}
