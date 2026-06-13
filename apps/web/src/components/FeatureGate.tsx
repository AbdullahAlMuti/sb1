import { type ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@repo/ui/components/ui/button';
import { useFeatureAccess, type FeatureFlag } from '@repo/auth/hooks/useFeatureAccess';

interface FeatureGateProps {
  flag: FeatureFlag | string;
  children: ReactNode;
  fallback?: ReactNode;
}

function LockedFeature({ flag }: { flag: string }) {
  const navigate = useNavigate();
  const label = flag.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 text-center p-8">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-muted">
        <Lock className="h-8 w-8 text-muted-foreground" />
      </div>
      <div>
        <h2 className="font-display text-xl font-semibold text-foreground">{label}</h2>
        <p className="mt-2 text-muted-foreground max-w-sm">
          This feature isn't available on your current plan. Upgrade to unlock it.
        </p>
      </div>
      <Button onClick={() => navigate('/choose-plan')}>Upgrade Plan</Button>
    </div>
  );
}

export function FeatureGate({ flag, children, fallback }: FeatureGateProps) {
  const { hasFeature, isLoading } = useFeatureAccess();

  if (isLoading) return null;

  if (!hasFeature(flag)) {
    return <>{fallback ?? <LockedFeature flag={flag} />}</>;
  }

  return <>{children}</>;
}
