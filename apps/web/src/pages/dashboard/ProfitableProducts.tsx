import { FeatureGate, useFeatureGate, TeaserWrapper } from '@/components/FeatureGate';
import { ProfitableUserGrid } from '@repo/ui/features/ebay-content-library';

export default function ProfitableProducts() {
  return (
    <FeatureGate flag="profitable_products">
      <ProfitableProductsContent />
    </FeatureGate>
  );
}

function ProfitableProductsContent() {
  const { gateAction } = useFeatureGate();

  return (
    <ProfitableUserGrid
      actionWrapper={gateAction}
      ListWrapper={TeaserWrapper as any}
    />
  );
}
