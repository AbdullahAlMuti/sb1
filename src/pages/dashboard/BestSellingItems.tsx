import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, 
  MapPin, 
  BarChart3, 
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Flame,
  ExternalLink,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const ITEMS_PER_PAGE = 10;

const countries = [
  { value: 'all', label: 'All Countries' },
  { value: 'US', label: 'US' },
  { value: 'UK', label: 'UK' },
  { value: 'DE', label: 'DE' },
  { value: 'AU', label: 'AU' },
  { value: 'CA', label: 'CA' },
];

export default function BestSellingItems() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['best-selling-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('best_selling_items')
        .select('*')
        .eq('is_active', true)
        .order('sales_count', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCountry = selectedCountry === 'all' || item.country === selectedCountry;
      return matchesSearch && matchesCountry;
    });
  }, [items, searchQuery, selectedCountry]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white">
            <Flame className="h-4 w-4" />
            <span className="text-sm font-semibold">Last 48h Best Selling eBay Items</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 w-48"
            />
          </div>

          {/* Country Filter */}
          <Select value={selectedCountry} onValueChange={(val) => { setSelectedCountry(val); setCurrentPage(1); }}>
            <SelectTrigger className="w-40">
              <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {countries.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Pagination */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = i + 1;
              if (totalPages > 5) {
                if (currentPage > 3) {
                  pageNum = currentPage - 2 + i;
                }
                if (currentPage > totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                }
              }
              if (pageNum < 1 || pageNum > totalPages) return null;
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => handlePageChange(pageNum)}
                  className="h-8 w-8"
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Header Row */}
        <div className="grid grid-cols-[120px_1fr_100px_100px_80px_60px_60px] gap-4 px-6 py-3 bg-secondary/30 border-b border-border text-sm font-medium text-muted-foreground">
          <div>Image</div>
          <div>Title</div>
          <div className="text-right">Price</div>
          <div className="text-right">Sales</div>
          <div className="text-center"><MapPin className="h-4 w-4 mx-auto" /></div>
          <div className="text-center"><BarChart3 className="h-4 w-4 mx-auto" /></div>
          <div className="text-center"><ShoppingCart className="h-4 w-4 mx-auto" /></div>
        </div>

        {/* Items */}
        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[120px_1fr_100px_100px_80px_60px_60px] gap-4 px-6 py-4 items-center">
                <Skeleton className="h-16 w-20 rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-16 ml-auto" />
                <Skeleton className="h-4 w-12 ml-auto" />
                <Skeleton className="h-4 w-8 mx-auto" />
                <Skeleton className="h-4 w-4 mx-auto" />
                <Skeleton className="h-4 w-4 mx-auto" />
              </div>
            ))}
          </div>
        ) : paginatedItems.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No items found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {paginatedItems.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[120px_1fr_100px_100px_80px_60px_60px] gap-4 px-6 py-4 items-center hover:bg-secondary/20 transition-colors"
              >
                {/* Image */}
                <div className="w-20 h-16 rounded-lg border border-border overflow-hidden bg-secondary/30 flex items-center justify-center">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>

                {/* Title */}
                <div>
                  <p className="text-sm font-medium text-primary hover:underline cursor-pointer line-clamp-2">
                    {item.title}
                  </p>
                  {item.category && (
                    <span className="text-xs text-muted-foreground">{item.category}</span>
                  )}
                </div>

                {/* Price */}
                <div className="text-right">
                  <span className="text-sm font-medium text-foreground">
                    ${Number(item.price).toFixed(2)}
                  </span>
                </div>

                {/* Sales */}
                <div className="text-right">
                  <span className="text-sm text-muted-foreground">
                    {Number(item.sales_count).toLocaleString()}
                  </span>
                </div>

                {/* Country */}
                <div className="text-center">
                  <span className="text-sm text-muted-foreground">{item.country}</span>
                </div>

                {/* Stats Icon */}
                <div className="text-center">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>

                {/* eBay Link */}
                <div className="text-center">
                  {item.ebay_url ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => window.open(item.ebay_url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  ) : (
                    <ShoppingCart className="h-4 w-4 text-muted-foreground mx-auto" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Pagination Info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          Showing {paginatedItems.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} to{' '}
          {Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)} of {filteredItems.length} items
        </p>
        <p>Page {currentPage} of {totalPages || 1}</p>
      </div>
    </div>
  );
}