import React from 'react';
import { Badge } from '@repo/ui/components/ui/badge';
import { Button } from '@repo/ui/components/ui/button';
import { Eye, Bookmark, Star, Flame, Lock, Diamond } from 'lucide-react';
import type { PublicStoreDesign } from '@repo/types';

interface Props {
  design: PublicStoreDesign;
  canAccess: boolean;
  isSaved: boolean;
  onToggleSave: (id: string, e: React.MouseEvent) => void;
  onView: (design: PublicStoreDesign) => void;
}

export function StoreDesignCard({ design, canAccess, isSaved, onToggleSave, onView }: Props) {
  const isLocked = !canAccess;
  const metrics = design.metadata || {};

  return (
    <div className="bg-white dark:bg-card rounded-[24px] border border-border shadow-sm overflow-hidden relative group transition-all duration-300 hover:shadow-md hover:border-violet-200">
      
      {/* Image Section */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {design.thumbnail_image ? (
          <img
            src={design.thumbnail_image}
            alt={design.title}
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${isLocked ? 'blur-sm scale-105' : ''}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 text-xs font-medium">
            No Image
          </div>
        )}

        {/* Locked Overlay */}
        {isLocked && (
          <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/70 backdrop-blur-[2px] flex flex-col items-center justify-center z-20">
            <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center mb-3">
              <Lock className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              {design.upgrade_message || `Upgrade to ${design.access_level === 'growth' ? 'Pro' : design.access_level === 'agency' ? 'Agency' : 'Premium'}`}
            </p>
          </div>
        )}

        {/* Theme Name Badge */}
        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-2 text-white border border-white/10 z-10 shadow-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
          <span className="text-[10px] font-medium tracking-wide">
            {metrics?.themeName || 'Custom'} Theme
          </span>
        </div>

        {/* Status Badges (Top Right) */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end z-10">
          {isLocked && (
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md text-foreground px-2 py-1 rounded-full shadow-sm border border-border flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span className="text-[9px] font-bold uppercase tracking-wider">Locked</span>
            </div>
          )}
          {design.is_premium && (
            <div className="bg-amber-500/90 backdrop-blur-md text-white px-2 py-1 rounded-full flex items-center gap-1 shadow-sm border border-amber-400/30">
              <Diamond className="w-3 h-3 fill-white" />
              <span className="text-[9px] font-bold uppercase tracking-wider">Premium</span>
            </div>
          )}
          {design.is_featured && !isLocked && (
            <div className="bg-violet-600/90 backdrop-blur-md text-white px-2 py-1 rounded-full flex items-center gap-1 shadow-sm border border-violet-500/30">
              <Star className="w-3 h-3 fill-white" />
              <span className="text-[9px] font-bold uppercase tracking-wider">Featured</span>
            </div>
          )}
          {design.is_trending && !isLocked && (
            <div className="bg-orange-500/90 backdrop-blur-md text-white px-2 py-1 rounded-full flex items-center gap-1 shadow-sm border border-orange-400/30">
              <Flame className="w-3 h-3 fill-white" />
              <span className="text-[9px] font-bold uppercase tracking-wider">Trending</span>
            </div>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="p-5 flex flex-col gap-4">
        
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="font-bold text-base text-foreground leading-tight">{design.title}</h3>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-muted text-[10px] font-medium hover:bg-muted">
                {design.niche || design.category || 'Uncategorized'}
              </Badge>
            </div>
          </div>
          <div className="flex flex-col items-end">
            {design.is_free ? (
              <span className="text-sm font-bold text-emerald-600">Free</span>
            ) : (
              <span className="text-sm font-bold">${design.price}</span>
            )}
            {design.compare_at_price && (
              <span className="text-[10px] text-muted-foreground line-through">
                ${design.compare_at_price}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
          {design.short_description || 'No description provided.'}
        </p>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-2 bg-muted/40 rounded-xl p-2.5">
          <div className="flex flex-col items-center justify-center p-1 border-r border-border/50">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Score</span>
            <span className="text-xs font-bold text-foreground">
              {metrics?.conversions || '0'}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center p-1 border-r border-border/50">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Revenue</span>
            <span className="text-xs font-bold text-emerald-600">
              {metrics?.revenue || '$0'}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center p-1">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Trend</span>
            <span className="text-xs font-bold text-violet-600">
              {metrics?.trend || '+0%'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          {isLocked ? (
            <Button
              className="flex-1 h-9 rounded-xl text-xs font-medium bg-violet-600 hover:bg-violet-700 text-white transition-all shadow-sm"
              onClick={() => onView(design)}
            >
              Upgrade to Access
            </Button>
          ) : (
            <div className="flex w-full gap-2">
              <Button
                variant="outline"
                className="flex-1 h-9 rounded-xl text-xs font-medium bg-card hover:bg-muted border-border hover:border-border transition-all"
                onClick={(e) => {
                  if (design.demo_url) {
                    window.open(design.demo_url, '_blank');
                  } else {
                    onView(design);
                  }
                }}
              >
                <Eye className="w-3.5 h-3.5 mr-2" /> {design.demo_url ? 'Preview' : 'View'}
              </Button>
              <Button
                variant={isSaved ? "default" : "outline"}
                size="icon"
                className={`h-9 w-9 rounded-xl transition-all shrink-0 ${isSaved ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm' : 'bg-card hover:bg-muted border-border'}`}
                onClick={(e) => onToggleSave(design.id, e)}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : 'text-muted-foreground'}`} />
              </Button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
