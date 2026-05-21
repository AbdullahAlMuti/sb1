import React from 'react';
import { Button } from '@repo/ui/components/ui/button';
import { SearchX, LayoutTemplate } from 'lucide-react';

interface Props {
  hasFilters: boolean;
  onReset: () => void;
}

export function StoreDesignEmptyState({ hasFilters, onReset }: Props) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center border border-dashed border-border rounded-3xl bg-white dark:bg-card">
        <div className="w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-6">
          <SearchX className="w-8 h-8 text-violet-600 dark:text-violet-400" />
        </div>
        <h3 className="text-xl font-bold mb-2">No templates found</h3>
        <p className="text-muted-foreground max-w-sm mb-6">
          We couldn't find any designs matching your current filters. Try adjusting your search criteria or clearing filters.
        </p>
        <Button 
          onClick={onReset}
          className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-sm"
        >
          Clear All Filters
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center border border-dashed border-border rounded-3xl bg-white dark:bg-card">
      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
        <LayoutTemplate className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-xl font-bold mb-2">Check back later</h3>
      <p className="text-muted-foreground max-w-sm">
        We're currently working on adding new premium store designs to the library.
      </p>
    </div>
  );
}
