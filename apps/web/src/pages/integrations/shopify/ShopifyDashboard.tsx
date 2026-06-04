import { Link, useNavigate } from 'react-router-dom';
import {
  Trophy, Store, Megaphone, Target, ArrowRight,
  TrendingUp, Search, Sparkles, PenTool, Play,
  ChevronRight, Eye, Heart, Globe, Settings, CreditCard,
  HelpCircle, ArrowUpRight, HelpCircle as HelpIcon
} from 'lucide-react';
import { cn } from '@repo/ui/lib/utils';
import { Button } from '@repo/ui/components/ui/button';
import { Badge } from '@repo/ui/components/ui/badge';
import {
  MOCK_KPIS, MOCK_PROBLEM_SOLVERS, MOCK_TRENDING_NICHES,
  MOCK_WINNING_PRODUCTS, MOCK_TOP_STORES, MOCK_AD_WINNERS,

  type ShopifyKPI, type ProblemSolver,
} from './shopify.mock';

const solverIcons: Record<string, React.ReactNode> = {
  search: <Search className="h-5 w-5 text-violet-500" />,
  store: <Globe className="h-5 w-5 text-emerald-500" />,
  ad: <Megaphone className="h-5 w-5 text-blue-500" />,
  ai: <Sparkles className="h-5 w-5 text-violet-600" />,
  pen: <PenTool className="h-5 w-5 text-amber-500" />,
};

const kpiIcons: Record<string, React.ReactNode> = {
  trophy: <Trophy className="h-5 w-5 text-violet-600 dark:text-violet-400" />,
  store: <Store className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
  megaphone: <Megaphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
  target: <Target className="h-5 w-5 text-violet-700 dark:text-violet-300" />,
};

const opportunityColors: Record<string, string> = {
  'Very High': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30',
  'High': 'bg-violet-50 text-violet-700 dark:bg-violet-950/20 dark:text-violet-400 border border-violet-100 dark:border-violet-900/30',
  'Medium': 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30',
  'Low': 'bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400 border border-slate-200 dark:border-slate-800',
};

export default function ShopifyDashboard() {
  const navigate = useNavigate();
  const heroProduct = MOCK_WINNING_PRODUCTS[0];

  return (
    <div className="space-y-10 max-w-[1400px] mx-auto pb-16">
      {/* Page Title & Greeting */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Shopify Growth Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Discover profitable products, spy on top store designs, find winning ads, and scale your brand.
          </p>
        </div>
      </div>

      {/* Hero Card & KPI Cards Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Premium Hero Card */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="flex-1 rounded-2xl p-6 bg-gradient-to-br from-violet-50/70 to-fuchsia-50/30 dark:from-violet-950/10 dark:to-slate-900 border border-violet-100 dark:border-violet-900/40 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-200/20 dark:bg-violet-900/10 rounded-full blur-3xl" />
            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between">
                <Badge className="bg-violet-600 hover:bg-violet-700 text-white font-medium px-2.5 py-1 rounded-lg">
                  🔥 Today's Best Opportunity
                </Badge>
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-xl shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Opp. Score</span>
                  <span className="text-sm font-extrabold text-violet-600 dark:text-violet-400">{heroProduct.score}</span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{heroProduct.image}</span>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{heroProduct.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">High Gross Margin Opportunity</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-4 leading-relaxed font-normal bg-white/40 dark:bg-slate-900/30 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
                  <strong className="text-slate-800 dark:text-slate-200">Why it trends: </strong>
                  {heroProduct.reason}
                </p>
              </div>

              {/* Product mini metrics */}
              <div className="grid grid-cols-3 gap-3 border-t border-slate-200/60 dark:border-slate-800/60 pt-4">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Selling Price</p>
                  <p className="text-base font-bold text-slate-800 dark:text-slate-200 mt-0.5">{heroProduct.price}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Est. Product Cost</p>
                  <p className="text-base font-bold text-slate-800 dark:text-slate-200 mt-0.5">{heroProduct.cost}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Gross Margin</p>
                  <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{heroProduct.margin}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-6 border-t border-slate-200/50 dark:border-slate-800/50 pt-4">
              <Button asChild className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-sm px-4">
                <Link to="/dashboard/shopify/winning-products">
                  View Opportunity
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl px-4">
                <Link to="/dashboard/shopify/copy-studio">
                  Generate Ad Copy
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Clean, border-based KPI cards */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-4">
          {MOCK_KPIS.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700"
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 flex items-center justify-center">
                  {kpiIcons[kpi.icon]}
                </div>
                <span className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5 border',
                  kpi.changeType === 'up'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/20'
                    : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border-red-100 dark:border-red-900/20'
                )}>
                  {kpi.change}
                </span>
              </div>
              <div className="mt-4">
                <p className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-200">{kpi.value}</p>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-0.5">{kpi.label}</p>
                <p className="text-[10px] text-slate-400 mt-2">{kpi.period}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Problem Solver - Action Oriented Cards */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">What do you want to solve today?</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {MOCK_PROBLEM_SOLVERS.map((solver) => (
            <Link
              key={solver.title}
              to={solver.href}
              className="group border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded-2xl p-4 flex flex-col justify-between hover:border-violet-300 dark:hover:border-violet-900/50"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-violet-50 dark:group-hover:bg-violet-950/50 border border-slate-200/50 dark:border-slate-700">
                  {solverIcons[solver.icon]}
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug group-hover:text-violet-600 dark:group-hover:text-violet-400">
                  {solver.title}
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-normal font-normal">
                  {solver.subtitle}
                </p>
              </div>
              <div className="flex items-center justify-between mt-6 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <span className="text-[10px] font-semibold text-slate-400 group-hover:text-violet-600 dark:group-hover:text-violet-400">Explore</span>
                <ChevronRight className="h-3 w-3 text-slate-400 group-hover:text-violet-600 dark:group-hover:text-violet-400" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Main Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Product Opportunities widget */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Product Opportunities</h2>
              <p className="text-xs text-slate-400">Top product opportunities selected today based on demand signals</p>
            </div>
            <Link
              to="/dashboard/shopify/winning-products"
              className="text-xs text-violet-600 hover:text-violet-700 font-semibold flex items-center gap-1.5 group"
            >
              View all Opportunities
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider bg-slate-50/50 dark:bg-slate-950/20">
                    <th className="py-3 px-4 w-12 text-center">Icon</th>
                    <th className="py-3 px-4">Opportunity</th>
                    <th className="py-3 px-4 text-center">Score</th>
                    <th className="py-3 px-4 text-right">Selling Price</th>
                    <th className="py-3 px-4 text-right">Est. Margin</th>
                    <th className="py-3 px-4 text-center">Ad Saturation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {MOCK_WINNING_PRODUCTS.slice(0, 4).map((product) => (
                    <tr
                      key={product.id}
                      onClick={() => navigate('/dashboard/shopify/winning-products')}
                      className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20 cursor-pointer"
                    >
                      <td className="py-3 px-4 text-2xl text-center">{product.image}</td>
                      <td className="py-3 px-4">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{product.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Updated daily</p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-xs font-extrabold text-violet-600 dark:text-violet-400">
                          {product.score}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-xs font-bold text-slate-700 dark:text-slate-300">{product.price}</td>
                      <td className="py-3 px-4 text-right text-xs font-bold text-emerald-600 dark:text-emerald-400">{product.margin}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="outline" className={cn(
                          'text-[9px] font-semibold tracking-wide px-2 py-0.5 rounded-md border',
                          product.adSaturation === 'Low'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border-amber-100 dark:border-amber-900/30'
                        )}>
                          {product.adSaturation}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Trending Niches widget */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Trending Niches</h2>
              <p className="text-xs text-slate-400">Hottest niche segments this week</p>
            </div>
            <Link
              to="/dashboard/shopify/product-research"
              className="text-xs text-violet-600 hover:text-violet-700 font-semibold"
            >
              Analyze Niche
            </Link>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-2xl p-4 shadow-xs space-y-3.5">
            {MOCK_TRENDING_NICHES.slice(0, 5).map((niche) => (
              <div key={niche.name} className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 last:border-0 last:pb-0">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{niche.name}</h4>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[9px] text-slate-400">Growth:</span>
                    <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">+{niche.growth}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={cn('text-[9px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider', opportunityColors[niche.opportunity])}>
                    {niche.opportunity} Opp.
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second Widgets Grid: Competitor Intelligence & Ad Inspiration */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Competitor Store Intelligence */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Store Intelligence</h2>
              <p className="text-xs text-slate-400">Competitors to track, analyze, and learn store design from</p>
            </div>
            <Link
              to="/dashboard/shopify/store-explorer"
              className="text-xs text-violet-600 hover:text-violet-700 font-semibold flex items-center gap-1.5 group"
            >
              View Stores
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-2xl p-4 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {MOCK_TOP_STORES.slice(0, 4).map((store) => (
                <div
                  key={store.id}
                  onClick={() => navigate('/dashboard/shopify/store-explorer')}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-violet-200 dark:hover:border-violet-900/30 bg-slate-50/20 dark:bg-slate-950/20 cursor-pointer"
                >
                  <span className="text-2xl bg-white dark:bg-slate-800 w-10 h-10 rounded-lg flex items-center justify-center shadow-xs border border-slate-150 dark:border-slate-750">
                    {store.logo}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{store.name}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">{store.niche} • {store.theme} theme</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{store.revenue}</p>
                    <p className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">+{store.growth}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Ad Inspiration */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Ad Inspiration</h2>
              <p className="text-xs text-slate-400">Browse current winning ad assets & formats</p>
            </div>
            <Link
              to="/dashboard/shopify/ad-library"
              className="text-xs text-violet-600 hover:text-violet-700 font-semibold flex items-center gap-1.5 group"
            >
              Ad Library
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {MOCK_AD_WINNERS.slice(0, 2).map((ad) => (
              <div
                key={ad.id}
                onClick={() => navigate('/dashboard/shopify/ad-library')}
                className="group border border-slate-250/70 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-2xl overflow-hidden hover:border-violet-200 dark:hover:border-violet-900/30 cursor-pointer shadow-xs"
              >
                <div className="aspect-video bg-slate-50 dark:bg-slate-950 flex items-center justify-center relative border-b border-slate-100 dark:border-slate-800">
                  <span className="text-3xl">{ad.thumbnail}</span>
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-md text-[9px] text-white font-semibold">
                    <span>{ad.platform}</span>
                  </div>
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-md">
                      <Play className="h-4.5 w-4.5 text-violet-600 ml-0.5" fill="currentColor" />
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-snug line-clamp-2">
                    "{ad.hookText}"
                  </p>
                  <div className="flex items-center justify-between mt-3 text-[10px] text-slate-400">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">{ad.angle}</span>
                    <span className="flex items-center gap-1"><Heart className="h-3 w-3 text-red-500/80" /> {ad.likes}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom Section: AI Copy Studio & Saved Research */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Compact AI Copy Studio widget */}
        <div className="lg:col-span-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">AI Copy Studio Workspace</h2>
          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-2xl p-6 shadow-xs flex flex-col justify-between h-[230px]">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-600" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Generate high-converting sales copy</h4>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed max-w-md">
                Produce high-impact ad text, descriptive catalogs, and title variations. Powered by customized e-commerce prompts.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Button onClick={() => navigate('/dashboard/shopify/copy-studio')} variant="outline" className="text-xs h-9 justify-start px-3 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-xl">
                <Sparkles className="h-3.5 w-3.5 mr-2 text-violet-500" />
                Generate Ad Copy
              </Button>
              <Button onClick={() => navigate('/dashboard/shopify/copy-studio')} variant="outline" className="text-xs h-9 justify-start px-3 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-xl">
                <PenTool className="h-3.5 w-3.5 mr-2 text-emerald-500" />
                Write Product Copy
              </Button>
            </div>
          </div>
        </div>

        {/* Saved Research Widget */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Saved Research</h2>
            <Link
              to="/dashboard/shopify/saved-items"
              className="text-xs text-violet-600 hover:text-violet-700 font-semibold"
            >
              Open Saved List
            </Link>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-2xl p-5 shadow-xs flex flex-col justify-between h-[230px]">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                  🥤 Portable Blender Pro
                </span>
                <span className="text-[10px] text-slate-400">Opportunity • Saved 1d ago</span>
              </div>
              <div className="flex items-center justify-between text-xs pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                  🐾 Pawfect Essentials
                </span>
                <span className="text-[10px] text-slate-400">Tracked Store • Saved 3d ago</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                  🧴 "The skin tool you didn't know you needed..."
                </span>
                <span className="text-[10px] text-slate-400">Ad Creative • Saved 4d ago</span>
              </div>
            </div>
            
            <p className="text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-3">
              Keep your research organized by clicking the bookmark icon on any item.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
