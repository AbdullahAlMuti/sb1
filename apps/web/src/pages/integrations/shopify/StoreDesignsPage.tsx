import React, { useState, useEffect } from 'react';
import {
  Star,
  RefreshCw,
  Target,
  TrendingUp,
  Info,
  ShoppingCart,
  ShieldCheck,
  StarHalf,
  Truck,
  Clock,
  Sparkles,
  Loader2,
  ChevronDown
} from 'lucide-react';
import { Button } from '@repo/ui/components/ui/button';
import { usePublishedStoreDesigns } from '../../../hooks/shopify/usePublishedStoreDesigns';
import { useStoreDesignAccess } from '../../../hooks/shopify/useStoreDesignAccess';
import { StoreDesignCard } from '../../../components/shopify/store-designs/StoreDesignCard';
import { StoreDesignHeroCard } from '../../../components/shopify/store-designs/StoreDesignHeroCard';
import { StoreDesignFilters } from '../../../components/shopify/store-designs/StoreDesignFilters';
import { StoreDesignEmptyState } from '../../../components/shopify/store-designs/StoreDesignEmptyState';
import type { StoreDesignFilters as FiltersType, StoreDesignSortBy } from '@repo/types';

export default function StoreDesignsPage() {
  const {
    designs,
    isLoading,
    hasMore,
    categories,
    niches,
    fetchFilterOptions,
    fetchDesigns,
    loadMore
  } = usePublishedStoreDesigns();

  const { canAccess, isLoading: isLoadingAccess } = useStoreDesignAccess();

  const [filters, setFilters] = useState<FiltersType>({ category: 'all', is_free: false });
  const [sortBy, setSortBy] = useState<StoreDesignSortBy>('sort_order');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [savedDesigns, setSavedDesigns] = useState<string[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Initial fetch
  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  useEffect(() => {
    // Only run if not initial load to avoid double fetch, or handle in the hook
    // Actually we want to fetch when filters/sort changes
    fetchDesigns(filters, sortBy, true).finally(() => setIsInitialLoad(false));
  }, [filters, sortBy, fetchDesigns]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchQuery || undefined }));
    }, 500);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const toggleSave = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (savedDesigns.includes(id)) {
      setSavedDesigns(savedDesigns.filter(item => item !== id));
    } else {
      setSavedDesigns([...savedDesigns, id]);
    }
  };

  const heroDesign = designs.find(d => d.is_trending || d.is_featured);
  const gridDesigns = designs.filter(d => d.id !== heroDesign?.id);
  const hasActiveFilters = filters.category !== 'all' || filters.is_free || !!filters.search;

  return (
    <div className="max-w-[1600px] mx-auto pb-12">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
          Store Designs
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
          Discover high-converting Shopify store layouts that drive results.
        </p>

        {/* Trust Indicators */}
        <div className="flex flex-wrap items-center gap-6 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-2 bg-violet-50 dark:bg-violet-900/20 px-3 py-1.5 rounded-full text-violet-700 dark:text-violet-300">
            <Star className="h-3.5 w-3.5" />
            <span>Curated from top-performing stores</span>
          </div>
          <div className="flex items-center gap-2 bg-violet-50 dark:bg-violet-900/20 px-3 py-1.5 rounded-full text-violet-700 dark:text-violet-300">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Updated daily</span>
          </div>
          <div className="flex items-center gap-2 bg-violet-50 dark:bg-violet-900/20 px-3 py-1.5 rounded-full text-violet-700 dark:text-violet-300">
            <Target className="h-3.5 w-3.5" />
            <span>Conversion-focused design patterns</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-8 items-start">
        {/* LEFT COLUMN - MAIN CONTENT */}
        <div className="flex-1 min-w-0 w-full space-y-8">
          
          {/* Featured Trending Hero Card */}
          {heroDesign && (
            <StoreDesignHeroCard
              design={heroDesign}
              canAccess={canAccess(heroDesign)}
              isSaved={savedDesigns.includes(heroDesign.id)}
              onToggleSave={toggleSave}
            />
          )}

          {/* Filter Bar */}
          <StoreDesignFilters
            categories={categories}
            niches={niches}
            selectedCategory={filters.category || 'all'}
            selectedSort={sortBy}
            searchQuery={searchQuery}
            onCategoryChange={(c) => setFilters({ ...filters, category: c })}
            onSortChange={setSortBy}
            onSearchChange={setSearchQuery}
            isFreeOnly={!!filters.is_free}
            onFreeOnlyToggle={(c) => setFilters({ ...filters, is_free: c ? true : undefined })}
          />

          {/* Gallery Grid or Loading/Empty State */}
          {isInitialLoad || isLoadingAccess ? (
            <div className="flex justify-center items-center py-32">
              <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
          ) : designs.length === 0 ? (
            <StoreDesignEmptyState 
              hasFilters={hasActiveFilters} 
              onReset={() => {
                setSearchQuery('');
                setFilters({ category: 'all' });
                setSortBy('sort_order');
              }} 
            />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gridDesigns.map((design) => (
                  <StoreDesignCard
                    key={design.id}
                    design={design}
                    canAccess={canAccess(design)}
                    isSaved={savedDesigns.includes(design.id)}
                    onToggleSave={toggleSave}
                    onView={() => {
                       // Handled by card for demo, or open a modal
                    }}
                  />
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button 
                    variant="outline" 
                    className="bg-white dark:bg-card rounded-xl border-border text-violet-600 dark:text-violet-400 font-semibold h-12 px-8 hover:bg-violet-50 shadow-sm w-full sm:w-auto"
                    onClick={() => loadMore(filters, sortBy)}
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Load More Designs
                    {!isLoading && <ChevronDown className="ml-2 h-4 w-4" />}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* RIGHT COLUMN - INSIGHTS SIDEBAR */}
        <div className="w-full xl:w-[320px] shrink-0 space-y-6 sticky top-24">
          {/* Card 1: Design Insights */}
          <div className="bg-white dark:bg-card border border-border rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-foreground flex items-center gap-2 text-base">
                Design Insights
                <Info className="h-4 w-4 text-muted-foreground" />
              </h3>
            </div>

            <div className="space-y-6">
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-2">Avg. Conversion Score</p>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-bold text-foreground">89</span>
                  <span className="text-sm font-semibold text-emerald-500 flex items-center">
                    <TrendingUp className="h-3.5 w-3.5 mr-1" />
                    12%
                  </span>
                </div>
                <div className="mt-4 h-12 w-full flex items-end overflow-hidden">
                  <svg viewBox="0 0 100 30" className="w-full h-full preserve-3d" preserveAspectRatio="none">
                    <path d="M0,25 C10,20 15,28 25,18 C35,8 40,22 50,15 C60,8 70,12 80,5 C90,-2 95,5 100,2 L100,30 L0,30 Z" fill="rgba(139, 92, 246, 0.1)" />
                    <path d="M0,25 C10,20 15,28 25,18 C35,8 40,22 50,15 C60,8 70,12 80,5 C90,-2 95,5 100,2" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              <div className="border-t border-border pt-5">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-3">Top Performing Theme</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                    <AppWindow className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">Dawn</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Used by 32% of top stores</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-5">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-3">Most Popular Style</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">Minimal & Clean</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Used by 48% of top stores</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Top Performing Elements */}
          <div className="bg-white dark:bg-card border border-border rounded-3xl p-6 shadow-sm">
            <h3 className="font-bold text-foreground text-base mb-5">
              Top Performing Elements
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-600 flex items-center justify-center group-hover:bg-violet-100 transition-colors">
                    <ShoppingCart className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Sticky Add to Cart</span>
                </div>
                <span className="text-sm font-bold text-foreground">72%</span>
              </div>
              
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Trust Badges</span>
                </div>
                <span className="text-sm font-bold text-foreground">68%</span>
              </div>

              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 flex items-center justify-center group-hover:bg-yellow-100 transition-colors">
                    <StarHalf className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Product Reviews</span>
                </div>
                <span className="text-sm font-bold text-foreground">63%</span>
              </div>

              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                    <Truck className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Free Shipping Bar</span>
                </div>
                <span className="text-sm font-bold text-foreground">57%</span>
              </div>

              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                    <Clock className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Urgency & Scarcity</span>
                </div>
                <span className="text-sm font-bold text-foreground">51%</span>
              </div>
            </div>
          </div>

          {/* Card 3: Custom Store CTA */}
          <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-3xl p-6 shadow-xl shadow-violet-200/50 dark:shadow-none text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl rounded-full" />
            <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-indigo-400/30 blur-xl rounded-full" />
            
            <div className="relative z-10">
              <Sparkles className="h-8 w-8 text-violet-200 mb-4" />
              <h3 className="font-bold text-xl mb-2">
                Need a Custom Store?
              </h3>
              <p className="text-violet-100 text-sm leading-relaxed mb-6">
                Get a high-converting, premium Shopify store designed by experts.
              </p>
              <Button className="w-full bg-white hover:bg-slate-50 text-violet-700 font-bold rounded-xl h-11 shadow-md">
                Get Custom Store
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

const AppWindow = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M10 4v4" />
    <path d="M2 8h20" />
    <path d="M6 4v4" />
  </svg>
);
