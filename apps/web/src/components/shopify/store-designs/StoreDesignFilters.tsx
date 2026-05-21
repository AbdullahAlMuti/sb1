import React from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { Input } from '@repo/ui/components/ui/input';
import { Switch } from '@repo/ui/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/components/ui/dropdown-menu';
import type { StoreDesignSortBy } from '@repo/types';

interface Props {
  categories: string[];
  niches: string[];
  selectedCategory: string;
  selectedSort: StoreDesignSortBy;
  searchQuery: string;
  onCategoryChange: (cat: string) => void;
  onSortChange: (sort: StoreDesignSortBy) => void;
  onSearchChange: (q: string) => void;
  onFreeOnlyToggle: (v: boolean) => void;
  isFreeOnly: boolean;
}

const SORT_OPTIONS: { value: StoreDesignSortBy; label: string }[] = [
  { value: 'sort_order', label: 'Recommended' },
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'featured', label: 'Featured First' },
  { value: 'trending', label: 'Trending First' },
];

export function StoreDesignFilters({
  categories,
  selectedCategory,
  selectedSort,
  searchQuery,
  onCategoryChange,
  onSortChange,
  onSearchChange,
  onFreeOnlyToggle,
  isFreeOnly,
}: Props) {
  const currentSortLabel = SORT_OPTIONS.find(o => o.value === selectedSort)?.label || 'Recommended';

  return (
    <div className="flex flex-col gap-4">
      {/* Search and Utility Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search templates, niches, tags..."
            className="pl-9 h-11 bg-white dark:bg-card border-border rounded-xl text-sm w-full shadow-sm focus-visible:ring-violet-500"
          />
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-4 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
          
          <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-card border border-border rounded-xl shadow-sm shrink-0 h-11">
            <Switch
              checked={isFreeOnly}
              onCheckedChange={onFreeOnlyToggle}
              id="free-only"
            />
            <label htmlFor="free-only" className="text-sm font-medium cursor-pointer select-none">
              Free Only
            </label>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-card border border-border rounded-xl shadow-sm h-11 shrink-0 text-sm font-medium hover:bg-muted/50 transition-colors focus:outline-none">
              Sort: {currentSortLabel}
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl p-1">
              {SORT_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => onSortChange(option.value)}
                  className={`rounded-lg cursor-pointer py-2 ${selectedSort === option.value ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 font-medium' : ''}`}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 hide-scrollbar">
        <button
          onClick={() => onCategoryChange('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all shadow-sm ${
            selectedCategory === 'all'
              ? 'bg-violet-600 text-white border-transparent'
              : 'bg-white dark:bg-card border-border text-foreground hover:border-violet-300 hover:text-violet-600'
          } border`}
        >
          All Themes
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all shadow-sm ${
              selectedCategory === cat
                ? 'bg-violet-600 text-white border-transparent'
                : 'bg-white dark:bg-card border-border text-foreground hover:border-violet-300 hover:text-violet-600'
            } border`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}
