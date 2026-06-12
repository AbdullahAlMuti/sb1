import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@repo/api-client/supabase/client';
import { Card, CardContent } from '@repo/ui/components/ui/card';
import { Input } from '@repo/ui/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/ui/components/ui/select';
import { Skeleton } from '@repo/ui/components/ui/skeleton';
import { Search, TrendingUp, HelpCircle, Package, Plus, ExternalLink, Flame, Crown, Award, Medal, Tag, Truck, Receipt } from 'lucide-react';
import { Button } from '@repo/ui/components/ui/button';
import { Badge } from '@repo/ui/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@repo/ui/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@repo/ui/components/ui/tabs';
import { toast } from 'sonner';

interface ProfitableProduct {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  price: number;
  shipping_cost: number;
  profit: number;
  stock: number;
  sales_count: number;
  total_sold: number;
  sku: string | null;
  tags: string[] | null;
  discount: number | null;
  country: string;
  category: string | null;
  ebay_url: string | null;
}

const ITEMS_PER_PAGE = 12;

// Format large numbers (e.g., 2870000 -> $2.87m)
const formatRevenue = (amount: number): string => {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(2)}m`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }
  return `$${amount.toFixed(2)}`;
};

// Format sold count (e.g., 115329 -> 115,329)
const formatSold = (count: number): string => {
  return count.toLocaleString();
};

// Get rank badge based on position
const getRankBadge = (rank: number) => {
  if (rank === 1) {
    return (
      <div className="absolute -top-2 -left-2 z-10 w-10 h-10 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-800">
        <Crown className="h-5 w-5 text-white" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="absolute -top-2 -left-2 z-10 w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-800">
        <Award className="h-5 w-5 text-white" />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="absolute -top-2 -left-2 z-10 w-10 h-10 bg-gradient-to-br from-amber-600 to-amber-700 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-800">
        <Medal className="h-5 w-5 text-white" />
      </div>
    );
  }
  return (
    <div className="absolute -top-2 -left-2 z-10 w-8 h-8 bg-gradient-to-br from-primary/80 to-primary rounded-full flex items-center justify-center shadow-md border-2 border-white dark:border-gray-800">
      <span className="text-xs font-bold text-primary-foreground">#{rank}</span>
    </div>
  );
};

// Get revenue color class based on amount
const getRevenueColorClass = (amount: number): string => {
  if (amount >= 1000000) return 'text-emerald-500 dark:text-emerald-400';
  if (amount >= 500000) return 'text-green-500 dark:text-green-400';
  if (amount >= 100000) return 'text-blue-500 dark:text-blue-400';
  return 'text-foreground';
};

// Get sold count color class based on count
const getSoldColorClass = (count: number): string => {
  if (count >= 100000) return 'text-purple-500 dark:text-purple-400';
  if (count >= 50000) return 'text-indigo-500 dark:text-indigo-400';
  if (count >= 10000) return 'text-cyan-500 dark:text-cyan-400';
  return 'text-foreground';
};

export default function ProfitableProducts() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();

  // Fetch items
  const { data: items, isLoading } = useQuery({
    queryKey: ['profitable-products', searchQuery, selectedCountry],
    queryFn: async () => {
      let query = (supabase.from('profitable_products' as any) as any)
        .select('id, title, description, image_url, price, shipping_cost, profit, stock, sales_count, total_sold, sku, tags, discount, country, category, ebay_url')
        .eq('is_active', true)
        .order('position', { ascending: true })
        .limit(200); // cap payload; admin rarely adds >200 curated products

      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }

      if (selectedCountry !== 'all') {
        query = query.eq('country', selectedCountry);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ProfitableProduct[];
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('public:profitable_products')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profitable_products',
        },
        (payload) => {
          // Invalidate query to trigger re-fetch and UI update
          queryClient.invalidateQueries({ queryKey: ['profitable-products'] });

          if (payload.eventType === 'INSERT') {
            toast.info("New profitable product added!");
          } else if (payload.eventType === 'DELETE') {
            // subtle update
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const categories = useMemo(() => {
    const values = (items || [])
      .map((i) => i.category)
      .filter((c): c is string => Boolean(c && c.trim()))
      .map((c) => c.trim());
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
  }, [items]);

  useEffect(() => {
    if (selectedCategory !== 'all' && !categories.includes(selectedCategory)) {
      setSelectedCategory('all');
    }
  }, [categories, selectedCategory]);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    if (selectedCategory === 'all') return items;
    return items.filter((i) => (i.category || '').trim() === selectedCategory);
  }, [items, selectedCategory]);

  const totalPages = filteredItems.length ? Math.ceil(filteredItems.length / ITEMS_PER_PAGE) : 1;
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleAddToEbay = (item: ProfitableProduct) => {
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
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Profitable Products</h1>
              <p className="text-sm text-muted-foreground">High margin winners • Real-time updates</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0 shadow-md px-3 py-1">
            <Package className="h-3.5 w-3.5 mr-1.5" />
            {items?.length || 0} Products Available
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
        <div className="flex flex-col gap-4">
          {/* Category Tabs */}
          <Tabs
            value={selectedCategory}
            onValueChange={(val) => {
              setSelectedCategory(val);
              setCurrentPage(1);
            }}
          >
            <TabsList className="w-full justify-start overflow-x-auto bg-background">
              <TabsTrigger value="all">All</TabsTrigger>
              {categories.map((c) => (
                <TabsTrigger key={c} value={c}>
                  {c}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Search + Country */}
          <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products by title..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 bg-background"
            />
          </div>
          <Select value={selectedCountry} onValueChange={(value) => {
            setSelectedCountry(value);
            setCurrentPage(1);
          }}>
            <SelectTrigger className="w-full sm:w-48 bg-background">
              <SelectValue placeholder="All Countries" />
            </SelectTrigger>
            <SelectContent>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-square w-full" />
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-5 w-1/3" />
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : paginatedItems?.length === 0 ? (
        <Card className="p-12 text-center bg-card/50 backdrop-blur-sm">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No products found</h3>
          <p className="text-muted-foreground mt-1">Try adjusting your search or filters</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
          {paginatedItems?.map((item, index) => {
            const globalRank = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
            const estimatedRevenue = item.price * item.total_sold;

            return (
              <Card
                key={item.id}
                className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/40 bg-card animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Rank Badge */}
                {getRankBadge(globalRank)}

                {/* Hot Badge for top 5 */}
                {globalRank <= 5 && (
                  <div className="absolute top-2 right-2 z-10">
                    <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 shadow-md text-[10px] px-2 py-0.5">
                      <Flame className="h-3 w-3 mr-1" />
                      HOT
                    </Badge>
                  </div>
                )}

                {/* Discount Badge */}
                {item.discount && item.discount > 0 ? (
                  <div className="absolute top-8 right-2 z-10">
                    <Badge className="bg-red-500 text-white border-0 shadow-md text-[10px] px-2 py-0.5 animate-pulse">
                      -{item.discount}%
                    </Badge>
                  </div>
                ) : null}

                {/* Product Image */}
                <div className="relative aspect-square bg-gradient-to-br from-muted to-muted/50 overflow-hidden">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-16 w-16 text-muted-foreground/50" />
                    </div>
                  )}

                  {/* Tags Overlay */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="absolute bottom-2 left-2 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {item.tags.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-[9px] h-4 px-1 bg-black/50 text-white backdrop-blur-sm border-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Quick Action Overlay */}
                  <div className="absolute inset-0 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAddToEbay(item)}
                        className="bg-primary hover:bg-primary/90 shadow-lg"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add to eBay
                      </Button>
                      {item.ebay_url && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="shadow-lg"
                          asChild
                        >
                          <a href={item.ebay_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Product Info */}
                <CardContent className="p-4 space-y-3">
                  {/* Title */}
                  <h3 className="font-semibold text-foreground line-clamp-2 text-sm min-h-[2.5rem] leading-tight group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>

                  {/* Description Preview (avoid duplicating title) */}
                  {item.description && item.description.trim() && item.description.trim() !== item.title.trim() && (
                    <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight">
                      {item.description}
                    </p>
                  )}

                  {/* Tags/Category/SKU Row */}
                  <div className="flex flex-wrap gap-1">
                    {item.category && (
                      <Badge variant="secondary" className="text-[10px] font-normal px-2 py-0.5 bg-muted/80">
                        {item.category}
                      </Badge>
                    )}
                    {item.sku && (
                      <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0 h-4 border-dashed text-muted-foreground">
                        {item.sku}
                      </Badge>
                    )}
                  </div>

                  {/* Price & Details */}
                  <div className="space-y-1">
                    <div className="flex items-baseline justify-between">
                      <p className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                        ${item.price.toFixed(2)}
                      </p>
                      {item.profit > 0 && (
                        <span className="text-xs text-emerald-500 font-medium px-1.5 py-0.5 bg-emerald-500/10 rounded-full">
                          +${item.profit.toFixed(2)} margin
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Truck className="h-3 w-3" /> ${item.shipping_cost.toFixed(2)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" /> {item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'}
                      </span>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="pt-3 border-t border-border/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-xs text-muted-foreground">Revenue</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="h-3 w-3 text-muted-foreground/60" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Estimated total revenue</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <span className={`font-bold text-sm ${getRevenueColorClass(estimatedRevenue)}`}>
                        {formatRevenue(estimatedRevenue)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                        <span className="text-xs text-muted-foreground">Items Sold</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="h-3 w-3 text-muted-foreground/60" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Total units sold</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <span className={`font-bold text-sm ${getSoldColorClass(item.total_sold)}`}>
                        {formatSold(item.total_sold)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            Previous
          </Button>
          <div className="flex items-center gap-1">
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
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-9 h-9 p-0 ${currentPage === pageNum ? 'shadow-md' : ''}`}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
