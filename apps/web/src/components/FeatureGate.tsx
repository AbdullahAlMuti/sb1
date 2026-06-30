import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@repo/ui/components/ui/button';
import { useEntitlement } from '@repo/auth/hooks/useEntitlement';
import { UpgradeModal } from './UpgradeModal';

interface FeatureGateProps {
  flag: string;
  children: ReactNode;
  fallback?: ReactNode;
}

interface FeatureGateContextType {
  isTrialing: boolean;
  isPaid: boolean;
  openUpgradeModal: () => void;
  gateAction: (action: () => void) => void;
}

const FeatureGateContext = createContext<FeatureGateContextType | null>(null);

export function useFeatureGate() {
  const context = useContext(FeatureGateContext);
  if (!context) {
    return {
      isTrialing: false,
      isPaid: true,
      openUpgradeModal: () => {},
      gateAction: (action: () => void) => action(),
    };
  }
  return context;
}

const flagToFeatureMap: Record<string, 'product-research' | 'profitable-products'> = {
  'ai_product_research': 'product-research',
  'profitable_products': 'profitable-products',
};

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
  const { isPaid, isTrialing, isLoading } = useEntitlement();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasAccess = isPaid || isTrialing;

  if (!hasAccess) {
    return <>{fallback ?? <LockedFeature flag={flag} />}</>;
  }

  const featureKey = flagToFeatureMap[flag] || 'product-research';
  const openUpgradeModal = () => setIsModalOpen(true);
  const gateAction = (action: () => void) => {
    if (isTrialing) {
      openUpgradeModal();
    } else {
      action();
    }
  };

  return (
    <FeatureGateContext.Provider value={{ isTrialing, isPaid, openUpgradeModal, gateAction }}>
      {children}
      <UpgradeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} feature={featureKey} />
    </FeatureGateContext.Provider>
  );
}

interface TeaserWrapperProps {
  children: ReactNode;
  totalCount: number;
  feature: string;
  containerClassName?: string;
}

export function TeaserWrapper({ children, totalCount, feature, containerClassName }: TeaserWrapperProps) {
  const { isTrialing, openUpgradeModal } = useFeatureGate();
  
  const childrenArray = React.Children.toArray(children);
  
  if (!isTrialing || childrenArray.length <= 2) {
    return <div className={containerClassName}>{children}</div>;
  }
  
  return (
    <div className="relative">
      <div className={containerClassName}>
        {childrenArray.map((child, index) => {
          if (index < 2) return child;
          
          if (React.isValidElement(child)) {
            const existingClassName = (child.props as any).className || '';
            return React.cloneElement(child as React.ReactElement<any>, {
              className: `${existingClassName} blur-[2px] pointer-events-none select-none opacity-60 transition-all`,
            });
          }
          return child;
        })}
      </div>
      
      {/* Absolute overlay banner */}
      <div className="absolute inset-x-0 bottom-0 top-1/4 bg-gradient-to-b from-transparent via-background/90 to-background flex items-end justify-center pointer-events-none z-10 pb-10">
        <div className="bg-card/95 backdrop-blur-md border border-primary/20 shadow-2xl rounded-2xl p-6 text-center max-w-md mx-auto pointer-events-auto">
          <h3 className="text-base font-bold text-foreground mb-1">
            Showing 2 of {totalCount.toLocaleString()}+ {feature}
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Upgrade to a paid plan to unlock the complete list and advanced insights.
          </p>
          <Button
            onClick={openUpgradeModal}
            size="sm"
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold"
          >
            Unlock All Results
          </Button>
        </div>
      </div>
    </div>
  );
}
