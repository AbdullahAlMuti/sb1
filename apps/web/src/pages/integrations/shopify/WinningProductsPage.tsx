import { useState } from 'react';
import { Trophy, TrendingUp, Search, SlidersHorizontal, ArrowRight, ExternalLink, Bookmark, Sparkles, X } from 'lucide-react';
import { ShopifyPageShell } from '@/components/shopify/ShopifyPageShell';
import { MOCK_WINNING_PRODUCTS, type WinningProduct } from './shopify.mock';
import { cn } from '@repo/ui/lib/utils';
import { Button } from '@repo/ui/components/ui/button';
import { Badge } from '@repo/ui/components/ui/badge';
import { useNavigate } from 'react-router-dom';

const saturationColors: Record<string, string> = {
  Low: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30',
  Medium: 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30',
  High: 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-100 dark:border-red-900/30',
};

export default function WinningProductsPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<WinningProduct | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'high-margin' | 'high-score'>('all');
  const [savedIds, setSavedIds] = useState<string[]>(['1']); // mock saved Portable Blender

  const toggleSave = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (savedIds.includes(id)) {
      setSavedIds(savedIds.filter(item => item !== id));
    } else {
      setSavedIds([...savedIds, id]);
    }
  };

  const filteredProducts = MOCK_WINNING_PRODUCTS.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (activeTab === 'high-margin') {
      const marginVal = parseInt(product.margin.replace('%', ''), 10);
      return matchesSearch && marginVal >= 70;
    }
    if (activeTab === 'high-score') {
      return matchesSearch && product.score >= 90;
    }
    return matchesSearch;
  });

  return (
    <ShopifyPageShell
      icon={Trophy}
      title="Product Opportunities"
      description="Curated high-potential products with verified demand, healthy margins, and low ad saturation."
    >
      <div className="space-y-6">
        {/* Filter controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          {/* Tabs */}
          <div className="flex gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all',
                activeTab === 'all'
                  ? 'bg-violet-600 border-violet-600 text-white shadow-xs'
                  : 'bg-transparent border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              All Opportunities
            </button>
            <button
              onClick={() => setActiveTab('high-margin')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all',
                activeTab === 'high-margin'
                  ? 'bg-violet-600 border-violet-600 text-white shadow-xs'
                  : 'bg-transparent border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              High Margin (70%+)
            </button>
            <button
              onClick={() => setActiveTab('high-score')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all',
                activeTab === 'high-score'
                  ? 'bg-violet-600 border-violet-600 text-white shadow-xs'
                  : 'bg-transparent border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              Top Scores (90+)
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-350 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition-all"
            />
          </div>
        </div>

        {/* Opportunities grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              onClick={() => setSelectedProduct(product)}
              className="group border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-2xl p-5 hover:border-violet-300 dark:hover:border-violet-900/50 transition-all duration-200 cursor-pointer shadow-xs relative overflow-hidden"
            >
              {/* Top Details */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl bg-slate-50 dark:bg-slate-800/80 w-12 h-12 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-800">
                    {product.image}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{product.name}</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Updated 4h ago</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => toggleSave(product.id, e)}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    <Bookmark className={cn('h-3.5 w-3.5', savedIds.includes(product.id) && 'fill-violet-600 text-violet-600')} />
                  </button>
                  <div className="flex items-center gap-1 bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/40 px-2.5 py-1 rounded-xl">
                    <span className="text-[9px] uppercase font-bold text-slate-400">Score</span>
                    <span className="text-xs font-extrabold text-violet-600 dark:text-violet-400">{product.score}</span>
                  </div>
                </div>
              </div>

              {/* Profit metrics */}
              <div className="grid grid-cols-3 gap-3 border-y border-slate-100 dark:border-slate-800/80 py-4 my-4">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-semibold">Selling Price</span>
                  <p className="text-sm font-bold text-slate-850 dark:text-slate-200 mt-0.5">{product.price}</p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-semibold">Est. Cost</span>
                  <p className="text-sm font-bold text-slate-850 dark:text-slate-200 mt-0.5">{product.cost}</p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-semibold">Margin</span>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{product.margin}</p>
                </div>
              </div>

              {/* Saturation and Trend indicator */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">Ad Saturation:</span>
                  <Badge variant="outline" className={cn('text-[9px] font-semibold px-2 py-0.5 rounded-md border', saturationColors[product.adSaturation])}>
                    {product.adSaturation}
                  </Badge>
                </div>

                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>+{product.demand}% Trend</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Drawer for Product Details */}
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs">
            <div className="w-full max-w-lg h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-250">
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl bg-slate-50 dark:bg-slate-800 w-14 h-14 rounded-2xl flex items-center justify-center border border-slate-100 dark:border-slate-800">
                      {selectedProduct.image}
                    </span>
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">{selectedProduct.name}</h2>
                      <p className="text-xs text-slate-400 mt-0.5">Opportunity Analysis</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 rounded-xl"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Score badge & short rationale */}
                <div className="bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/40 p-4 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-violet-700 dark:text-violet-300">Opportunity Score</span>
                    <span className="text-base font-extrabold text-violet-600 dark:text-violet-400">{selectedProduct.score} / 100</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-450 leading-relaxed font-normal">
                    {selectedProduct.reason}
                  </p>
                </div>

                {/* Extended Financial breakdown */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Financial Indicators</h3>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 bg-slate-50/20 dark:bg-slate-900/40">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Target Selling Price</span>
                      <span className="font-bold text-slate-800 dark:text-white">{selectedProduct.price}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Estimated Supplier Cost</span>
                      <span className="font-bold text-slate-800 dark:text-white">{selectedProduct.cost}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Estimated Gross Margin</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedProduct.margin}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t border-slate-100 dark:border-slate-800 pt-2.5">
                      <span className="text-slate-400">Potential Profit per Sale</span>
                      <span className="font-bold text-slate-850 dark:text-white">
                        ${(parseFloat(selectedProduct.price.replace('$', '')) - parseFloat(selectedProduct.cost.replace('$', ''))).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Supplier Links */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Verified Supplier Links</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <a
                      href="https://aliexpress.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-900/50 bg-white dark:bg-slate-950 text-xs text-slate-700 dark:text-slate-350"
                    >
                      <span className="font-semibold">AliExpress Supplier</span>
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                    </a>
                    <a
                      href="https://cjdropshipping.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-900/50 bg-white dark:bg-slate-950 text-xs text-slate-700 dark:text-slate-350"
                    >
                      <span className="font-semibold">CJ Dropshipping</span>
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex gap-3">
                <Button
                  onClick={() => navigate('/dashboard/shopify/copy-studio')}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-xs text-xs font-semibold py-2.5 h-10 flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="h-4 w-4" />
                  Generate Ad Copy
                </Button>
                <Button
                  onClick={() => setSelectedProduct(null)}
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
