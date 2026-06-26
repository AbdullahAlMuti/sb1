import { useMemo, useState } from 'react';
import { Card, CardContent } from '@repo/ui/components/ui/card';
import { Input } from '@repo/ui/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/ui/components/ui/select';
import { Skeleton } from '@repo/ui/components/ui/skeleton';
import { Search, TrendingUp, HelpCircle, Package, Plus, ExternalLink, Flame, Crown, Award, Medal, Truck } from 'lucide-react';
import { Button } from '@repo/ui/components/ui/button';
import { Badge } from '@repo/ui/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@repo/ui/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@repo/ui/components/ui/tabs';
import { toast } from 'sonner';

import { ProfitableProduct } from '@repo/marketplace-core/features/ebay-content-library/types/content-library.types';
import { useProfitableProducts } from '@repo/marketplace-core/features/ebay-content-library/hooks/useProfitableProducts';

const ITEMS_PER_PAGE = 12;

const formatRevenue = (amount: number): string => {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(2)}m`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }
  return `$${amount.toFixed(2)}`;
};

const formatSold = (count: number): string => {
  return count.toLocaleString();
};

const getRankBadge = (rank: number) => {
  if (rank === 1) {
    return (
      <div className="absolute -top-2 -left-2 z-10 w-11 h-11 bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600 rounded-xl flex items-center justify-center shadow-[0_4px_16px_rgba(245,158,11,0.45)] border border-yellow-200/50 dark:border-yellow-400/30 animate-pulse">
        <Crown className="h-6 w-6 text-white drop-shadow-[0_2px_4px_rgba(180,83,9,0.5)]" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="absolute -top-2 -left-2 z-10 w-10 h-10 bg-gradient-to-br from-slate-200 via-slate-300 to-slate-500 rounded-xl flex items-center justify-center shadow-[0_4px_16px_rgba(148,163,184,0.35)] border border-slate-100/50 dark:border-slate-300/30">
        <Award className="h-5 w-5 text-white drop-shadow-[0_2px_4px_rgba(71,85,105,0.4)]" />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="absolute -top-2 -left-2 z-10 w-10 h-10 bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900 rounded-xl flex items-center justify-center shadow-[0_4px_16px_rgba(180,83,9,0.4)] border border-amber-500/50 dark:border-amber-700/30">
        <Medal className="h-5 w-5 text-white drop-shadow-[0_2px_4px_rgba(120,53,4,0.4)]" />
      </div>
    );
  }
  return (
    <div className="absolute -top-2 -left-2 z-10 w-8 h-8 bg-gradient-to-br from-slate-800 to-slate-950 dark:from-slate-900 dark:to-black rounded-lg flex items-center justify-center shadow-md border border-slate-700/50">
      <span className="text-xs font-black text-slate-200">#{rank}</span>
    </div>
  );
};

const getRevenueColorClass = (amount: number): string => {
  if (amount >= 1000000) return 'text-emerald-500 dark:text-emerald-400';
  if (amount >= 500000) return 'text-green-500 dark:text-green-400';
  if (amount >= 100000) return 'text-blue-500 dark:text-blue-400';
  return 'text-foreground';
};

const getSoldColorClass = (count: number): string => {
  if (count >= 100000) return 'text-purple-500 dark:text-purple-400';
  if (count >= 50000) return 'text-indigo-500 dark:text-indigo-400';
  if (count >= 10000) return 'text-cyan-500 dark:text-cyan-400';
  return 'text-foreground';
};

interface ProfitableUserGridProps {
  actionWrapper?: (action: () => void) => void;
  ListWrapper?: React.FC<{ children: React.ReactNode; totalCount: number; className?: string }>;
}

export function ProfitableUserGrid({ actionWrapper = (fn) => fn(), ListWrapper }: ProfitableUserGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const { items, isLoading } = useProfitableProducts({
    mode: 'user',
    searchQuery,
    selectedCountry,
  });

  const categories = useMemo(() => {
    const values = (items || [])
      .map((i) => i.category)
      .filter((c): c is string => Boolean(c && c.trim()))
      .map((c) => c.trim());
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    if (selectedCategory === 'all') return items;
    return items.filter((i) => (i.category || '').trim() === selectedCategory);
  }, [items, selectedCategory]);

  const maxSold = useMemo(() => {
    if (!items || items.length === 0) return 1;
    return Math.max(...items.map((i) => i.total_sold));
  }, [items]);

  const maxRevenue = useMemo(() => {
    if (!items || items.length === 0) return 1;
    return Math.max(...items.map((i) => i.price * i.total_sold));
  }, [items]);

  const totalPages = filteredItems.length ? Math.ceil(filteredItems.length / ITEMS_PER_PAGE) : 1;
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleAddToEbay = (item: ProfitableProduct) => {
    actionWrapper(() => {
      const listingData = {
        title: item.title,
        price: item.price,
        image_url: item.image_url,
        category: item.category,
        description: item.description,
        sku: item.sku,
        shipping: item.shipping_cost,
        source: 'profitable-products',
        source_url: item.ebay_url,
      };

      localStorage.setItem('pending_ebay_listing', JSON.stringify(listingData));
      window.open('https://www.ebay.com/sl/sell', '_blank');

      toast.success('Product data ready!', {
        description: 'Open eBay listing page and the extension will auto-fill the details.',
      });
    });
  };

  const DefaultListWrapper: React.FC<{ children: React.ReactNode; totalCount: number; className?: string }> = ({ children, className }) => (
    <div className={className}>{children}</div>
  );

  const Wrapper = ListWrapper || DefaultListWrapper;

  return (
    <div className="relative space-y-8 pb-12">
      {/* Decorative ambient background mesh */}
      <div className="absolute -top-24 right-0 w-80 h-80 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none select-none -z-10" />
      <div className="absolute top-20 left-10 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] pointer-events-none select-none -z-10" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-[0_8px_24px_rgba(16,185,129,0.25)] dark:shadow-[0_8px_30px_rgba(16,185,129,0.15)] flex-shrink-0 animate-bounce-subtle">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-foreground/75 bg-clip-text text-transparent">
                  Profitable Products
                </h1>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <p className="text-sm text-muted-foreground/90 mt-1">
                High margin winners compiled by AI • Real-time updates
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0 shadow-lg shadow-blue-500/10 px-3.5 py-1.5 rounded-full font-bold text-xs select-none">
            <Package className="h-3.5 w-3.5 mr-1.5" />
            {items?.length || 0} Products Available
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-5 bg-card/60 dark:bg-slate-900/60 backdrop-blur-md border border-border/80 dark:border-slate-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] rounded-[22px]">
        <div className="flex flex-col gap-5">
          {/* Category Tabs */}
          {categories.length > 0 && (
            <Tabs
              value={selectedCategory}
              onValueChange={(val) => {
                actionWrapper(() => {
                  setSelectedCategory(val);
                  setCurrentPage(1);
                });
              }}
              className="w-full"
            >
              <TabsList className="w-full justify-start overflow-x-auto bg-slate-100/50 dark:bg-slate-950/40 p-1.5 rounded-xl gap-1">
                <TabsTrigger 
                  value="all" 
                  className="rounded-lg text-xs font-semibold px-4 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all"
                >
                  All Categories
                </TabsTrigger>
                {categories.map((c) => (
                  <TabsTrigger 
                    key={c} 
                    value={c}
                    className="rounded-lg text-xs font-semibold px-4 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all"
                  >
                    {c}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}

          {/* Search + Country */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground/75" />
              <Input
                placeholder="Search products by keyword..."
                value={searchQuery}
                onChange={(e) => {
                  actionWrapper(() => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  });
                }}
                className="pl-11 bg-background/55 focus-visible:ring-emerald-500/35 focus-visible:border-emerald-500/50 border-border/75 rounded-xl h-11 transition-all"
              />
            </div>
            <Select 
              value={selectedCountry} 
              onValueChange={(value) => {
                actionWrapper(() => {
                  setSelectedCountry(value);
                  setCurrentPage(1);
                });
              }}
            >
              <SelectTrigger className="w-full md:w-56 bg-background/55 border-border/75 rounded-xl h-11 focus:ring-emerald-500/35">
                <SelectValue placeholder="Filter by Country" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/80">
                <SelectItem value="all">🌍 All Countries</SelectItem>
                <SelectItem value="US">🇺🇸 United States</SelectItem>
                <SelectItem value="UK">🇬🇧 United Kingdom</SelectItem>
                <SelectItem value="DE">🇩🇪 Germany</SelectItem>
                <SelectItem value="AU">🇦🇺 Australia</SelectItem>
                <SelectItem value="CA">🇨🇦 Canada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Product Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
            <Card key={i} className="overflow-hidden border border-border/60 rounded-[20px]">
              <Skeleton className="aspect-square w-full" />
              <CardContent className="p-5 space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-6 w-1/3" />
                <div className="pt-2 border-t border-border/40 space-y-3">
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-1/4" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : paginatedItems?.length === 0 ? (
        <Card className="p-16 text-center bg-card/60 dark:bg-slate-900/60 border border-border/80 dark:border-slate-800/80 rounded-[22px] shadow-[0_4px_24px_rgba(0,0,0,0.01)] max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/5 flex items-center justify-center mx-auto mb-5 border border-emerald-500/10">
            <TrendingUp className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold text-foreground">No matches found</h3>
          <p className="text-muted-foreground text-sm mt-2 max-w-xs mx-auto">
            Try adjusting your search criteria or country filter to discover high-velocity opportunities.
          </p>
        </Card>
      ) : (
        <Wrapper totalCount={filteredItems.length} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {paginatedItems?.map((item, index) => {
            const globalRank = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
            const estimatedRevenue = item.price * item.total_sold;
            const revenuePercentage = Math.round((estimatedRevenue / maxRevenue) * 100);
            const soldPercentage = Math.round((item.total_sold / maxSold) * 100);

            return (
              <div
                key={item.id}
                className="group relative"
              >
                {/* Ambient glow container visible on hover */}
                <div className="absolute -inset-[1px] bg-gradient-to-r from-emerald-500 to-teal-500 rounded-[21px] blur-sm opacity-0 group-hover:opacity-40 transition duration-500 pointer-events-none" />
                
                <Card
                  className="relative overflow-hidden border border-border/80 dark:border-slate-800/80 hover:border-transparent bg-gradient-to-b from-card/90 to-card/98 dark:from-slate-900/90 dark:to-slate-950/98 backdrop-blur-md rounded-[20px] transition-all duration-500 ease-out h-full flex flex-col group-hover:shadow-[0_20px_45px_-12px_rgba(16,185,129,0.12)]"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  {getRankBadge(globalRank)}

                  {globalRank <= 5 && (
                    <div className="absolute top-2.5 right-2.5 z-10 select-none">
                      <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 shadow-md text-[10px] px-2.5 py-0.5 font-extrabold animate-pulse">
                        <Flame className="h-3 w-3 mr-1" />
                        HOT
                      </Badge>
                    </div>
                  )}

                  {item.discount && item.discount > 0 ? (
                    <div className="absolute top-10 right-2.5 z-10 select-none">
                      <Badge className="bg-red-500 text-white border-0 shadow-md text-[10px] px-2 py-0.5 font-black">
                        -{item.discount}%
                      </Badge>
                    </div>
                  ) : null}

                  {/* Product Image */}
                  <div className="relative aspect-square bg-slate-100 dark:bg-slate-900/50 overflow-hidden rounded-t-[18px] select-none">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-16 w-16 text-muted-foreground/30" />
                      </div>
                    )}

                    {item.tags && item.tags.length > 0 && (
                      <div className="absolute bottom-2.5 left-2.5 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        {item.tags.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-[9px] h-4.5 px-2 bg-black/60 text-white backdrop-blur-sm border-0 rounded-md font-semibold">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Action button hover layer */}
                    <div className="absolute inset-0 flex items-end justify-center pb-5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-3 group-hover:translate-y-0">
                      <div className="flex gap-2 px-4 w-full">
                        <Button
                          size="sm"
                          onClick={() => handleAddToEbay(item)}
                          className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold shadow-lg shadow-emerald-500/20 border-0 rounded-xl h-9"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add to eBay
                        </Button>
                        {item.ebay_url && (
                          <Button
                            size="sm"
                            className="bg-white/95 dark:bg-slate-800/95 hover:bg-white dark:hover:bg-slate-800 shadow-lg text-foreground border border-border/50 rounded-xl w-9 h-9 p-0"
                            onClick={() => actionWrapper(() => window.open(item.ebay_url!, '_blank'))}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Product Info */}
                  <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2.5">
                      {/* Title */}
                      <h3 className="font-bold text-foreground line-clamp-2 text-sm min-h-[2.5rem] leading-snug group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors duration-300">
                        {item.title}
                      </h3>

                      {item.description && item.description.trim() && item.description.trim() !== item.title.trim() && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug min-h-[2rem]">
                          {item.description}
                        </p>
                      )}

                      {/* Badges row */}
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {item.category && (
                          <Badge variant="secondary" className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800/80 text-muted-foreground border-0 rounded-md">
                            {item.category}
                          </Badge>
                        )}
                        {item.sku && (
                          <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0.5 h-4.5 border-dashed text-muted-foreground/85 rounded-md">
                            {item.sku}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0.5 border-border/40 text-muted-foreground/80 rounded-md">
                          {item.country === 'US' ? '🇺🇸 US' :
                           item.country === 'UK' ? '🇬🇧 UK' :
                           item.country === 'DE' ? '🇩🇪 DE' :
                           item.country === 'AU' ? '🇦🇺 AU' :
                           item.country === 'CA' ? '🇨🇦 CA' : `🌍 ${item.country}`}
                        </Badge>
                      </div>

                      {/* Price, Margin & Stats */}
                      <div className="space-y-2 pt-1">
                        <div className="flex items-baseline justify-between">
                          <p className="text-xl font-extrabold text-foreground tracking-tight">
                            ${item.price.toFixed(2)}
                          </p>
                          {item.profit > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                              +${item.profit.toFixed(2)} margin
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground/85 font-medium">
                          <span className="flex items-center gap-1">
                            <Truck className="h-3.5 w-3.5 text-muted-foreground/70" /> ${item.shipping_cost.toFixed(2)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Package className="h-3.5 w-3.5 text-muted-foreground/70" /> {item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stats horizontal relative bars */}
                    <div className="pt-3.5 border-t border-border/50 space-y-3">
                      {/* Revenue Progress */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Revenue
                          </span>
                          <span className={`font-bold ${getRevenueColorClass(estimatedRevenue)}`}>
                            {formatRevenue(estimatedRevenue)}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                            style={{ width: `${Math.min(100, Math.max(8, revenuePercentage))}%` }}
                          />
                        </div>
                      </div>

                      {/* Items Sold Progress */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                            Items Sold
                          </span>
                          <span className={`font-bold ${getSoldColorClass(item.total_sold)}`}>
                            {formatSold(item.total_sold)}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-purple-500 rounded-full transition-all duration-1000"
                            style={{ width: `${Math.min(100, Math.max(8, soldPercentage))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </Wrapper>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => actionWrapper(() => {
              setCurrentPage(p => Math.max(1, p - 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            })}
            disabled={currentPage === 1}
            className="hover:bg-emerald-500 hover:text-white transition-colors border-border/80 rounded-xl px-4"
          >
            Previous
          </Button>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => actionWrapper(() => {
                    setCurrentPage(pageNum);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  })}
                  className={`w-10 h-10 p-0 rounded-xl ${currentPage === pageNum ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/10 border-0' : 'border-border/80'}`}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => actionWrapper(() => {
              setCurrentPage(p => Math.min(totalPages, p + 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            })}
            disabled={currentPage === totalPages}
            className="hover:bg-emerald-500 hover:text-white transition-colors border-border/80 rounded-xl px-4"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
