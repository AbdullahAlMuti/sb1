import { useState } from 'react';
import { Bookmark, Trophy, Globe, Megaphone, Sparkles, X, Heart, ExternalLink, ArrowRight } from 'lucide-react';
import { ShopifyPageShell } from '@/components/shopify/ShopifyPageShell';
import { MOCK_WINNING_PRODUCTS, MOCK_TOP_STORES, MOCK_AD_WINNERS } from './shopify.mock';
import { cn } from '@repo/ui/lib/utils';
import { Button } from '@repo/ui/components/ui/button';
import { Badge } from '@repo/ui/components/ui/badge';

export default function SavedItemsPage() {
  const [activeTab, setActiveTab] = useState<'products' | 'stores' | 'ads'>('products');

  // Simple clean mock structures matching previously saved items
  const savedProducts = MOCK_WINNING_PRODUCTS.slice(0, 2);
  const savedStores = MOCK_TOP_STORES.slice(0, 1);
  const savedAds = MOCK_AD_WINNERS.slice(0, 1);

  return (
    <ShopifyPageShell
      icon={Bookmark}
      title="Saved Research"
      description="Organize your product opportunities, tracked stores, and ad creatives. Bookmark items across the dashboard to store them here."
    >
      <div className="space-y-6">
        {/* Tab switcher */}
        <div className="flex gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('products')}
            className={cn(
              'px-4 py-2 text-xs font-bold transition-all relative flex items-center gap-1.5',
              activeTab === 'products'
                ? 'text-violet-650 dark:text-violet-300 after:absolute after:bottom-[-9px] after:left-0 after:right-0 after:h-0.5 after:bg-violet-650'
                : 'text-slate-500 hover:text-slate-900'
            )}
          >
            <Trophy className="h-3.5 w-3.5" />
            Products ({savedProducts.length})
          </button>
          <button
            onClick={() => setActiveTab('stores')}
            className={cn(
              'px-4 py-2 text-xs font-bold transition-all relative flex items-center gap-1.5',
              activeTab === 'stores'
                ? 'text-violet-650 dark:text-violet-350 after:absolute after:bottom-[-9px] after:left-0 after:right-0 after:h-0.5 after:bg-violet-650'
                : 'text-slate-500 hover:text-slate-900'
            )}
          >
            <Globe className="h-3.5 w-3.5" />
            Tracked Stores ({savedStores.length})
          </button>
          <button
            onClick={() => setActiveTab('ads')}
            className={cn(
              'px-4 py-2 text-xs font-bold transition-all relative flex items-center gap-1.5',
              activeTab === 'ads'
                ? 'text-violet-650 dark:text-violet-350 after:absolute after:bottom-[-9px] after:left-0 after:right-0 after:h-0.5 after:bg-violet-650'
                : 'text-slate-500 hover:text-slate-900'
            )}
          >
            <Megaphone className="h-3.5 w-3.5" />
            Ad Creatives ({savedAds.length})
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'products' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedProducts.map((product) => (
              <div
                key={product.id}
                className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-2xl p-4 flex flex-col justify-between shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl bg-slate-50 dark:bg-slate-800 w-10 h-10 rounded-lg flex items-center justify-center border border-slate-100">
                      {product.image}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{product.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Opp. Score: {product.score}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-bold text-emerald-600 bg-emerald-50/50 dark:text-emerald-400 dark:bg-emerald-950/20 border-emerald-100/50">
                    Margin: {product.margin}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-slate-100 dark:border-slate-850 pt-3 mt-4">
                  <span className="text-[10px] text-slate-400">Price: {product.price}</span>
                  <span className="text-[10px] text-slate-400">Cost: {product.cost}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'stores' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedStores.map((store) => (
              <div
                key={store.id}
                className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-2xl p-4 flex flex-col justify-between shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl bg-slate-50 dark:bg-slate-850 w-10 h-10 rounded-lg flex items-center justify-center">
                    {store.logo}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{store.name}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">{store.niche} • {store.theme} Theme</p>
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-slate-100 dark:border-slate-850 pt-3 mt-4">
                  <span className="text-[10px] text-slate-400">Revenue: {store.revenue}</span>
                  <span className="text-[10px] text-emerald-600 font-bold">Growth: +{store.growth}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'ads' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {savedAds.map((ad) => (
              <div
                key={ad.id}
                className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between"
              >
                <div className="aspect-video bg-slate-50 dark:bg-slate-950 flex items-center justify-center border-b border-slate-100 dark:border-slate-850">
                  <span className="text-3xl">{ad.thumbnail}</span>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-xs font-medium text-slate-750 dark:text-slate-350 leading-relaxed">
                    "{ad.hookText}"
                  </p>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-850 pt-2.5">
                    <span>{ad.platform} Ad</span>
                    <span className="flex items-center gap-1"><Heart className="h-3 w-3 text-red-500" /> {ad.likes}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ShopifyPageShell>
  );
}
