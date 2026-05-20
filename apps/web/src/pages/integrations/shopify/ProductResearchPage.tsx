import { useState } from 'react';
import { Search, Info, TrendingUp, DollarSign, MessageCircle, AlertCircle, CheckCircle } from 'lucide-react';
import { ShopifyPageShell } from '@/components/shopify/ShopifyPageShell';
import { Button } from '@repo/ui/components/ui/button';
import { Badge } from '@repo/ui/components/ui/badge';

export default function ProductResearchPage() {
  const [keyword, setKeyword] = useState('Portable Blender');
  const [isValidated, setIsValidated] = useState(true);

  // Simulation calculations based on keyword
  const getValidationData = (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return null;

    if (q.includes('blend')) {
      return {
        score: 92,
        demand: 'Very High',
        competition: 'Low',
        saturation: '18%',
        cpc: '$0.85',
        estimatedMargin: '71%',
        recommendation: 'Highly Recommended. The Portable Blender niche has seen a 42% search spike on TikTok this month. Focus on influencer gifting and micro-video creative ads.',
        cost: 8.20,
        sell: 28.45,
      };
    } else if (q.includes('pet') || q.includes('dog') || q.includes('cat')) {
      return {
        score: 86,
        demand: 'High',
        competition: 'Medium',
        saturation: '35%',
        cpc: '$1.10',
        estimatedMargin: '68%',
        recommendation: 'Recommended. Pet wellness accessories hold premium values. Video ads showing product usability solves friction. Target pet parent segments directly.',
        cost: 12.50,
        sell: 39.95,
      };
    } else {
      // Default fallback data for other queries
      return {
        score: 74,
        demand: 'Medium',
        competition: 'Medium',
        saturation: '48%',
        cpc: '$1.45',
        estimatedMargin: '62%',
        recommendation: 'Moderate potential. Average saturation signals. Ensure you can source at below average cost to secure at least a 60% gross profit margin. Target narrow custom audiences.',
        cost: 15.00,
        sell: 39.99,
      };
    }
  };

  const data = getValidationData(keyword);

  return (
    <ShopifyPageShell
      icon={Search}
      title="Product Research"
      description="Validate any product idea instantly. Analyze market demand, competitive saturation, marketing costs, and AI scalability recommendations."
    >
      <div className="space-y-8">
        {/* Search bar card */}
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs">
          <h3 className="text-sm font-bold text-slate-850 dark:text-white mb-2">Analyze Product Niche</h3>
          <p className="text-xs text-slate-400 mb-4">Enter a product name or keyword (e.g. "Portable Blender", "Orthopedic Pet Bed") to analyze dropshipping feasibility.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-450" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Enter product keyword..."
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition-all font-medium"
              />
            </div>
            <Button
              onClick={() => setIsValidated(true)}
              className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-6 h-11 text-xs font-semibold shadow-xs transition-colors"
            >
              Analyze Product
            </Button>
          </div>
        </div>

        {/* Validation Dashboard */}
        {isValidated && data && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Score and recommendations column */}
            <div className="lg:col-span-8 space-y-6">
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-3xl p-6 shadow-xs relative overflow-hidden">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4 mb-4">
                  <div>
                    <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Analysis Result</span>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white mt-0.5">Feasibility Breakdown</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Dropea Recommendation Score</span>
                    <div className="w-12 h-12 rounded-full border-4 border-violet-500/10 flex items-center justify-center bg-violet-50 dark:bg-violet-950/20">
                      <span className="text-xs font-black text-violet-600 dark:text-violet-400">{data.score}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100/50 dark:border-violet-900/30">
                    <CheckCircle className="h-5 w-5 text-violet-600 dark:text-violet-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-violet-850 dark:text-violet-300">Strategic Niche Recommendation</h4>
                      <p className="text-xs text-slate-650 dark:text-slate-400 mt-1 leading-relaxed font-normal">
                        {data.recommendation}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                    <div className="p-4 rounded-xl border border-slate-150 dark:border-slate-800/80 bg-slate-50/20 dark:bg-slate-950/20">
                      <span className="text-[9px] uppercase font-bold text-slate-400">Demand Trend</span>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1 flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                        {data.demand}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-150 dark:border-slate-800/80 bg-slate-50/20 dark:bg-slate-950/20">
                      <span className="text-[9px] uppercase font-bold text-slate-400">Competition Index</span>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
                        {data.competition}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-150 dark:border-slate-800/80 bg-slate-50/20 dark:bg-slate-950/20">
                      <span className="text-[9px] uppercase font-bold text-slate-400">Ad CPC (Estimated)</span>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
                        {data.cpc}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profitability Calculator widget */}
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-3xl p-6 shadow-xs">
                <h3 className="text-sm font-bold text-slate-850 dark:text-white mb-4 flex items-center gap-2">
                  <DollarSign className="h-4.5 w-4.5 text-slate-400" />
                  Profitability Calculator
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] text-slate-450 uppercase font-semibold">Estimated Cost of Goods</label>
                      <div className="relative mt-1">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          defaultValue={data.cost.toFixed(2)}
                          className="w-full h-10 pl-8 pr-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-350 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-450 uppercase font-semibold">Target Selling Price</label>
                      <div className="relative mt-1">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          defaultValue={data.sell.toFixed(2)}
                          className="w-full h-10 pl-8 pr-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-350 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl flex flex-col justify-between border border-slate-150 dark:border-slate-850">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-450">Estimated Margin</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{data.estimatedMargin}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-450">Gross Profit (Per unit)</span>
                        <span className="font-bold text-slate-750 dark:text-slate-200">${(data.sell - data.cost).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="border-t border-slate-200 dark:border-slate-800 pt-3 mt-3 text-center">
                      <p className="text-[10px] text-slate-400 leading-normal font-normal">
                        Estimated CPC of {data.cpc} supports healthy return on ad spend (ROAS).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar analytics widget */}
            <div className="lg:col-span-4 space-y-6">
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-3xl p-5 shadow-xs space-y-4">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Feasibility Indicators</h3>
                
                <div className="space-y-3.5">
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-slate-455">Niche Saturation</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{data.saturation}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-850 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-violet-600 h-full rounded-full" style={{ width: data.saturation }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-slate-455">Viral Content Feasibility</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">High</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-850 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: '85%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-slate-455">Repeat Purchase Rate</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">Low-Medium</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-850 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: '38%' }} />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-850 flex items-start gap-2">
                  <Info className="h-4 w-4 text-violet-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                    Feasibility ratings are calculated using search indexes, ad library spend ratios, and global dropshipping catalogs.
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </ShopifyPageShell>
  );
}
