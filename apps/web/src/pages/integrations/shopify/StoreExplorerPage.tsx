import { useState } from 'react';
import { Globe, Search, ArrowRight, ExternalLink, Bookmark, Filter, X, Zap, Box, Tag } from 'lucide-react';
import { ShopifyPageShell } from '@/components/shopify/ShopifyPageShell';
import { MOCK_TOP_STORES, type TopStore } from './shopify.mock';
import { cn } from '@repo/ui/lib/utils';
import { Button } from '@repo/ui/components/ui/button';
import { Badge } from '@repo/ui/components/ui/badge';

export default function StoreExplorerPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNiche, setSelectedNiche] = useState<string>('All');
  const [selectedStore, setSelectedStore] = useState<TopStore | null>(null);
  const [savedStores, setSavedStores] = useState<string[]>(['1']);

  const toggleSave = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (savedStores.includes(id)) {
      setSavedStores(savedStores.filter(item => item !== id));
    } else {
      setSavedStores([...savedStores, id]);
    }
  };

  const niches = ['All', 'Pets', 'Beauty', 'Fitness', 'Home & Kitchen', 'Fashion'];

  const filteredStores = MOCK_TOP_STORES.filter(store => {
    const matchesSearch = store.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesNiche = selectedNiche === 'All' || store.niche.toLowerCase() === selectedNiche.toLowerCase();
    return matchesSearch && matchesNiche;
  });

  // Mocked apps and best sellers for selected store details
  const storeDetails = {
    apps: ['Klaviyo Email Marketing', 'Loox Reviews', 'PageFly Page Builder', 'DSers Dropshipping', 'Lucky Orange Session Recorder'],
    sellers: [
      { name: 'Portable Blender Pro', sales: '840 units/mo', price: '$28.45' },
      { name: 'Self-Cleaning Shaker Bottle', sales: '410 units/mo', price: '$19.99' },
      { name: 'Fruit Infuser Pitcher', sales: '290 units/mo', price: '$24.95' }
    ]
  };

  return (
    <ShopifyPageShell
      icon={Globe}
      title="Store Explorer"
      description="Analyze top competitor Shopify stores. Identify their installed apps, themes, active ads, and monthly estimated revenue."
    >
      <div className="space-y-6">
        {/* Search & Niche Select */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          {/* Niche Categories */}
          <div className="flex gap-1.5 overflow-x-auto">
            {niches.map((niche) => (
              <button
                key={niche}
                onClick={() => setSelectedNiche(niche)}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all',
                  selectedNiche === niche
                    ? 'bg-violet-600 border-violet-600 text-white shadow-xs'
                    : 'bg-transparent border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                {niche}
              </button>
            ))}
          </div>

          {/* Search Store */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search store name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-350 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition-all"
            />
          </div>
        </div>

        {/* Stores Grid list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredStores.map((store) => (
            <div
              key={store.id}
              onClick={() => setSelectedStore(store)}
              className="group border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-2xl p-5 hover:border-violet-300 dark:hover:border-violet-900/50 transition-all duration-200 cursor-pointer shadow-xs relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl bg-slate-50 dark:bg-slate-800/80 w-12 h-12 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-850">
                    {store.logo}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{store.name}</h3>
                    <p className="text-[10px] text-slate-450 mt-0.5">{store.niche} • {store.theme} Theme</p>
                  </div>
                </div>

                <button
                  onClick={(e) => toggleSave(store.id, e)}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650 transition-colors"
                >
                  <Bookmark className={cn('h-3.5 w-3.5', savedStores.includes(store.id) && 'fill-violet-600 text-violet-600')} />
                </button>
              </div>

              {/* Revenue & Growth metrics */}
              <div className="grid grid-cols-3 gap-3 border-y border-slate-100 dark:border-slate-800/80 py-4 my-4">
                <div>
                  <span className="text-[9px] text-slate-450 uppercase font-semibold">Est. Revenue</span>
                  <p className="text-sm font-bold text-slate-850 dark:text-slate-200 mt-0.5">{store.revenue}</p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-455 uppercase font-semibold">Growth Rate</span>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-450 mt-0.5">+{store.growth}</p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-455 uppercase font-semibold">Active Ads</span>
                  <p className="text-sm font-bold text-slate-850 dark:text-slate-200 mt-0.5">{store.adsCount} Ads</p>
                </div>
              </div>

              {/* Call to spy details */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <span className="text-[10px] text-slate-400">Spy apps & best-sellers</span>
                <span className="text-xs text-violet-600 group-hover:text-violet-700 font-semibold flex items-center gap-1">
                  Inspect Store
                  <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Drawer for Store Details */}
        {selectedStore && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs">
            <div className="w-full max-w-lg h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-250">
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl bg-slate-50 dark:bg-slate-800 w-14 h-14 rounded-2xl flex items-center justify-center border border-slate-100 dark:border-slate-800">
                      {selectedStore.logo}
                    </span>
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">{selectedStore.name}</h2>
                      <p className="text-xs text-slate-400 mt-0.5">Shopify Competitor Profile</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedStore(null)}
                    className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 rounded-xl"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Score badge & quick stats */}
                <div className="bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/40 p-4 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-violet-700 dark:text-violet-355 font-bold">Store Niche</span>
                    <Badge className="bg-violet-600 text-white font-medium text-[10px]">{selectedStore.niche}</Badge>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-violet-750 dark:text-violet-355 font-semibold">Shopify Theme</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedStore.theme} Theme</span>
                  </div>
                </div>

                {/* Best Selling Products */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Box className="h-4 w-4 text-slate-450" />
                    Estimated Best Sellers
                  </h3>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-150 dark:divide-slate-850">
                    {storeDetails.sellers.map((item, idx) => (
                      <div key={idx} className="p-3 flex justify-between items-center text-xs bg-slate-50/20 dark:bg-slate-900/25">
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{item.name}</span>
                          <p className="text-[10px] text-slate-400 mt-0.5">Price: {item.price}</p>
                        </div>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-lg border border-emerald-100 dark:border-emerald-900/10">
                          {item.sales}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Installed Shopify Apps */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-slate-450" />
                    Installed App Stack ({storeDetails.apps.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {storeDetails.apps.map((app, idx) => (
                      <Badge key={idx} variant="outline" className="text-[10px] px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350">
                        {app}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex gap-3">
                <a
                  href="https://shopify.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-xs text-xs font-semibold py-2.5 h-10 flex items-center justify-center gap-1.5 transition-colors"
                >
                  Visit Competitor Live Store
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <Button
                  onClick={() => setSelectedStore(null)}
                  variant="outline"
                  className="border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-350 rounded-xl text-xs py-2.5 h-10 px-4"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ShopifyPageShell>
  );
}
