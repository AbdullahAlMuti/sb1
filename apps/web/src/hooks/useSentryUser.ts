import { useEffect } from 'react';
import { useAuth } from '@repo/auth/hooks/useAuth';
import { identifySentryUser, clearSentryUser } from '@/lib/sentry';

/**
 * Keeps Sentry's user context in sync with auth state.
 * Mount once near the top of the app (DashboardLayout).
 */
export function useSentryUser() {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      identifySentryUser(user.id, user.email);
    } else {
      clearSentryUser();
    }
  }, [user?.id]);
}
