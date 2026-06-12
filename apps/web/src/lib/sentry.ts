import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

export function initSentry() {
  if (!SENTRY_DSN) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    // Only send errors in production/staging — not dev noise
    enabled: import.meta.env.PROD,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Mask all text/inputs by default — user privacy
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // 10% of transactions for performance tracing
    tracesSampleRate: 0.1,
    // 5% of sessions for session replay (errors always captured)
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
    // Strip auth tokens from breadcrumbs/URLs
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
