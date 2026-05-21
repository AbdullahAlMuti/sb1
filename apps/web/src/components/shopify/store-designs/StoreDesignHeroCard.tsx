import React from 'react';
import { Badge } from '@repo/ui/components/ui/badge';
import { Button } from '@repo/ui/components/ui/button';
import { Eye, Bookmark, Flame, Lock } from 'lucide-react';
import type { PublicStoreDesign } from '@repo/types';

interface Props {
  design: PublicStoreDesign;
  canAccess: boolean;
  isSaved: boolean;
  onToggleSave: (id: string, e: React.MouseEvent) => void;
  onView?: (design: PublicStoreDesign) => void;
}

export function StoreDesignHeroCard({ design, canAccess, isSaved, onToggleSave, onView }: Props) {
  const isLocked = !canAccess;
  const metrics = design.metadata || {};

  return (
    <div className="relative w-full rounded-[32px] border border-violet-100/50 dark:border-violet-900/50 shadow-lg shadow-violet-500/5 bg-white dark:bg-card overflow-hidden group">
      
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-100/50 dark:bg-violet-900/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 opacity-60 pointer-events-none"></div>

      <div className="flex flex-col md:flex-row relative z-10">
        
        {/* Left Content Area */}
        <div className="flex-1 p-8 md:p-12 flex flex-col justify-center">
          
          <div className="mb-4">
            <div className="inline-flex items-center gap-1.5 bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-orange-200 dark:border-orange-500/20">
              <Flame className="w-3.5 h-3.5 fill-current" /> Trending Design
            </div>
          </div>
          
          <div className="space-y-4 mb-8">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              {design.title}
            </h2>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-800">
                {design.niche || design.category}
              </Badge>
              {design.is_free ? (
                <span className="text-sm font-bold text-emerald-600">Free</span>
              ) : (
                <span className="text-sm font-bold">${design.price}</span>
              )}
            </div>
            <p className="text-base text-muted-foreground max-w-md leading-relaxed">
              {design.description || design.short_description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-sm mb-8">
            <div className="bg-muted/50 rounded-2xl p-4 border border-border/50">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Avg. Conversions
              </p>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-foreground">
                  {metrics?.conversions || '0'}
                </span>
                <span className="text-xs font-bold text-emerald-500 mb-1">
                  {metrics?.trend || '+0%'}
                </span>
              </div>
            </div>
            <div className="bg-muted/50 rounded-2xl p-4 border border-border/50">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Avg. Revenue
              </p>
              <span className="text-2xl font-bold text-emerald-600">
                {metrics?.revenue || '$0'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isLocked ? (
              <Button
                size="lg"
                className="rounded-xl h-12 px-8 bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-500/20"
                onClick={() => onView && onView(design)}
              >
                Upgrade to Access
              </Button>
            ) : (
              <>
                <Button
                  size="lg"
                  className="rounded-xl h-12 px-8 bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-500/20"
                  onClick={() => {
                    if (design.demo_url) window.open(design.demo_url, '_blank');
                    else if (onView) onView(design);
                  }}
                >
                  <Eye className="w-4 h-4 mr-2" /> Live Preview
                </Button>
                <Button
                  size="lg"
                  variant={isSaved ? "default" : "outline"}
                  className={`rounded-xl h-12 w-12 p-0 ${isSaved ? 'bg-violet-600 hover:bg-violet-700 text-white border-transparent' : 'bg-transparent border-border'}`}
                  onClick={(e) => onToggleSave(design.id, e)}
                >
                  <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                </Button>
              </>
            )}
          </div>

        </div>

        {/* Right Image Area */}
        <div className="md:w-1/2 p-6 md:p-8 flex items-center justify-center relative">
          <div className="relative w-full aspect-video md:aspect-square max-h-[500px] rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl shadow-black/10 border border-black/5 dark:border-white/5 bg-muted">
            {design.preview_image ? (
              <img
                src={design.preview_image}
                alt={design.title}
                className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${isLocked ? 'blur-md scale-105' : ''}`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                No Preview Available
              </div>
            )}

            {isLocked && (
              <div className="absolute inset-0 bg-white/40 dark:bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center mb-4">
                  <Lock className="w-7 h-7 text-slate-400" />
                </div>
                <p className="text-lg font-semibold text-foreground bg-white/80 dark:bg-slate-800/80 px-6 py-2 rounded-full shadow-sm backdrop-blur-md">
                  {design.upgrade_message || `Upgrade to ${design.access_level === 'growth' ? 'Pro' : 'Premium'}`}
                </p>
              </div>
            )}

            <div className="absolute bottom-6 right-6 bg-black/60 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2 text-white border border-white/10 z-10 shadow-lg">
              <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
              <span className="text-xs font-medium tracking-wide">
                {metrics?.themeName || 'Custom'} Theme
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
