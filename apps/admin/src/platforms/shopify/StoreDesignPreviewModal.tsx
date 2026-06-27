import React from 'react';
import {
  Dialog,
  DialogContent,
} from '@repo/ui/components/ui/dialog';
import { Badge } from '@repo/ui/components/ui/badge';
import { Button } from '@repo/ui/components/ui/button';
import { Eye, Bookmark, Star, Flame, Lock } from 'lucide-react';
import type { StoreDesign } from '@repo/types';

interface Props {
  design: StoreDesign | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function StoreDesignPreviewModal({ design, isOpen, onClose }: Props) {
  if (!design) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md p-8 border-border bg-muted/20">
        <div className="flex flex-col items-center">
          <p className="text-xs text-muted-foreground font-medium mb-6">User Dashboard Preview</p>
          
          {/* Card Wrapper (Mirrors User Frontend) */}
          <div className="w-[320px] bg-white dark:bg-card rounded-[24px] border border-border shadow-sm overflow-hidden relative group">
            
            {/* Image Section */}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
              {design.thumbnail_image ? (
                <img
                  src={design.thumbnail_image}
                  alt={design.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 text-xs font-medium">
                  No Image
                </div>
              )}

              {/* Theme Name Badge */}
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-2 text-white border border-white/10 z-10 shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                <span className="text-[10px] font-medium tracking-wide">
                  {(design.metadata as any)?.themeName || 'Custom'} Theme
                </span>
              </div>

              {/* Status Badges (Top Right) */}
              <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end z-10">
                {design.is_featured && (
                  <div className="bg-violet-600/90 backdrop-blur-md text-white px-2 py-1 rounded-full flex items-center gap-1 shadow-sm border border-violet-500/30">
                    <Star className="w-3 h-3 fill-white" />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Featured</span>
                  </div>
                )}
                {design.is_trending && (
                  <div className="bg-orange-500/90 backdrop-blur-md text-white px-2 py-1 rounded-full flex items-center gap-1 shadow-sm border border-orange-400/30">
                    <Flame className="w-3 h-3 fill-white" />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Trending</span>
                  </div>
                )}
                {!design.is_visible && (
                  <div className="bg-slate-800/90 backdrop-blur-md text-white px-2 py-1 rounded-full shadow-sm border border-slate-700/50">
                    <span className="text-[9px] font-bold uppercase tracking-wider">Hidden</span>
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
              <p className="text-xs text-muted-foreground line-clamp-2">
                {design.short_description || 'No description provided.'}
              </p>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-2 bg-muted/40 rounded-xl p-2.5">
                <div className="flex flex-col items-center justify-center p-1 border-r border-border/50">
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Score</span>
                  <span className="text-xs font-bold text-foreground">
                    {(design.metadata as any)?.conversions || '0'}
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center p-1 border-r border-border/50">
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Revenue</span>
                  <span className="text-xs font-bold text-emerald-600">
                    {(design.metadata as any)?.revenue || '$0'}
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center p-1">
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Trend</span>
                  <span className="text-xs font-bold text-violet-600">
                    {(design.metadata as any)?.trend || '+0%'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <Button variant="outline" className="flex-1 h-9 rounded-xl text-xs font-medium bg-card hover:bg-muted border-border hover:border-border transition-all">
                  <Eye className="w-3.5 h-3.5 mr-2" /> Preview
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl bg-card hover:bg-muted border-border hover:border-border transition-all shrink-0">
                  <Bookmark className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>

            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
