import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CreditCard, X } from 'lucide-react';
import { Button } from '@repo/ui/components/ui/button';
import { cn } from '@repo/ui/lib/utils';

interface CreditsLowBannerProps {
  creditsRemaining: number;
  creditsTotal: number;
  eligible: boolean;
  onRenew: () => void;
  className?: string;
}

const DISMISS_KEY = 'dismiss_low_credits_banner_v1';

export function CreditsLowBanner({
  creditsRemaining,
  creditsTotal,
  eligible,
  onRenew,
  className,
}: CreditsLowBannerProps) {
  const shouldShow = useMemo(() => {
    if (!eligible) return false;
    if (creditsTotal <= 0) return false;
    return creditsRemaining <= 5;
  }, [eligible, creditsRemaining, creditsTotal]);

  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(Boolean(localStorage.getItem(DISMISS_KEY)));
  }, []);

  if (!shouldShow || dismissed) return null;

  return (
    <div
      className={cn(
        'mb-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-destructive/10 p-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Credits running low</p>
            <p className="text-xs text-muted-foreground">
              You have <span className="font-medium text-foreground">{creditsRemaining}</span> of{' '}
              <span className="font-medium text-foreground">{creditsTotal}</span> credits remaining. Renew to
              avoid interruptions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={onRenew} className="h-8">
            <CreditCard className="h-4 w-4 mr-2" />
            Renew
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              localStorage.setItem(DISMISS_KEY, '1');
              setDismissed(true);
            }}
            aria-label="Dismiss low credits banner"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
