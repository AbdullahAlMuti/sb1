import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

/**
 * Initializes Sentry for the admin app. No-op unless VITE_SENTRY_DSN is set, and
 * only reports in production builds. Mirrors apps/web/src/lib/sentry.ts.
 */
export function initSentry() {
  if (!SENTRY_DSN) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    enabled: import.meta.env.PROD,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
    // Strip auth tokens from breadcrumbs/URLs.
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') {
        const url = breadcrumb.data?.url as string | undefined;
        if (url?.includes('supabase') && url?.includes('token')) return null;
      }
      return breadcrumb;
    },
  });
}

export function identifySentryUser(userId: string, email?: string) {
  Sentry.setUser({ id: userId, email });
}

export function clearSentryUser() {
  Sentry.setUser(null);
}
