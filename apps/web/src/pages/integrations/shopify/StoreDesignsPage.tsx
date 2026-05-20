import { useState } from 'react';
import {
  Star,
  RefreshCw,
  Target,
  Flame,
  Bookmark,
  ChevronDown,
  Eye,
  TrendingUp,
  Info,
  ShoppingCart,
  ShieldCheck,
  StarHalf,
  Truck,
  Clock,
  Sparkles,
} from 'lucide-react';
import { MOCK_STORE_DESIGNS, TRENDING_STORE_DESIGN } from './shopify.mock';
import { cn } from '@repo/ui/lib/utils';
import { Button } from '@repo/ui/components/ui/button';
import { Badge } from '@repo/ui/components/ui/badge';

export default function StoreDesignsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [savedDesigns, setSavedDesigns] = useState<string[]>(['1']);

  const categories = [
    'All',
    'Home & Kitchen',
    'Beauty & Skincare',
    'Fitness',
    'Pets',
    'Fashion',
    'Electronics',
    'Health & Wellness',
    'Baby',
    'View all'
  ];

  const toggleSave = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (savedDesigns.includes(id)) {
      setSavedDesigns(savedDesigns.filter(item => item !== id));
    } else {
      setSavedDesigns([...savedDesigns, id]);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto pb-12">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
          Store Designs
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
          Discover high-converting Shopify store layouts that drive results.
        </p>

        {/* Trust Indicators */}
        <div className="flex flex-wrap items-center gap-6 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-2 bg-violet-50 dark:bg-violet-900/20 px-3 py-1.5 rounded-full text-violet-700 dark:text-violet-300">
            <Star className="h-3.5 w-3.5" />
            <span>Curated from top-performing stores</span>
          </div>
          <div className="flex items-center gap-2 bg-violet-50 dark:bg-violet-900/20 px-3 py-1.5 rounded-full text-violet-700 dark:text-violet-300">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Updated daily</span>
          </div>
          <div className="flex items-center gap-2 bg-violet-50 dark:bg-violet-900/20 px-3 py-1.5 rounded-full text-violet-700 dark:text-violet-300">
            <Target className="h-3.5 w-3.5" />
            <span>Conversion-focused design patterns</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-8 items-start">
        {/* LEFT COLUMN - MAIN CONTENT */}
        <div className="flex-1 min-w-0 w-full space-y-8">
          
          {/* Featured Trending Hero Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 lg:p-8 shadow-sm flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group hover:border-violet-200 transition-colors">
            {/* Soft decorative background glow */}
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-violet-100/50 dark:bg-violet-900/20 rounded-full blur-3xl opacity-50" />
            
            {/* Content Side */}
            <div className="flex-1 space-y-6 relative z-10 w-full">
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="secondary" className="bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 hover:bg-orange-100 border-0 flex items-center gap-1.5 px-3 py-1 text-xs">
                  <Flame className="h-3.5 w-3.5" />
                  Trending Design
                </Badge>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {TRENDING_STORE_DESIGN.name}
                  </h2>
                  <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300 hover:bg-violet-200 border-0 text-[10px]">
                    {TRENDING_STORE_DESIGN.niche}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
                  Clean, elegant, and conversion-optimized fashion store built for high AOV and repeat customers.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-2">
                <div>
                  <span className="text-[11px] text-slate-500 font-medium">Conversion Score</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">{TRENDING_STORE_DESIGN.conversions}</span>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">
                      <TrendingUp className="h-3 w-3" />
                      {TRENDING_STORE_DESIGN.trend}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 font-medium">Est. Revenue</span>
                  <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {TRENDING_STORE_DESIGN.revenue} <span className="text-sm font-normal text-slate-500">/mo</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-sm shadow-violet-200 dark:shadow-none h-11 px-6">
                  View Full Design
                </Button>
                <Button variant="outline" className="rounded-xl h-11 px-6 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <Bookmark className="h-4 w-4 mr-2 text-violet-600" />
                  Save Design
                </Button>
              </div>
            </div>

            {/* Image Preview Side */}
            <div className="w-full md:w-[55%] relative z-10 flex-shrink-0">
              <div className="rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none aspect-[16/10] bg-slate-50 relative group-hover:scale-[1.02] transition-transform duration-500">
                <img 
                  src={TRENDING_STORE_DESIGN.thumbnail} 
                  alt={TRENDING_STORE_DESIGN.name}
                  className="w-full h-full object-cover object-top"
                />
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {['All Niches', 'All Themes', 'All Styles', 'Conversion Focus'].map((filter) => (
                <button key={filter} className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-violet-300 transition-colors shadow-sm">
                  {filter}
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>
              ))}
              <button className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-violet-300 transition-colors shadow-sm">
                <Target className="h-3.5 w-3.5 text-slate-400" />
                More Filters
              </button>
            </div>
            
            <Button variant="ghost" className="text-violet-600 font-semibold text-xs hover:bg-violet-50">
              <Bookmark className="h-4 w-4 mr-1.5" />
              Save Filter
            </Button>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-900 dark:text-white mr-2">Popular:</span>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-4 py-2 rounded-full text-xs font-semibold transition-colors",
                    selectedCategory === cat
                      ? "bg-violet-600 text-white shadow-sm"
                      : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-200"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Gallery Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MOCK_STORE_DESIGNS.map((design) => (
              <div 
                key={design.id} 
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[24px] overflow-hidden group hover:border-violet-300 dark:hover:border-violet-700 transition-all hover:shadow-lg hover:shadow-violet-100 dark:hover:shadow-none flex flex-col"
              >
                {/* Preview Image */}
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 border-b border-slate-100 dark:border-slate-800">
                  <img 
                    src={design.thumbnail} 
                    alt={design.name} 
                    className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                  />
                  
                  {/* Overlays */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Theme Badge Overlay */}
                  <div className="absolute top-4 left-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur shadow-sm rounded-lg px-2.5 py-1 flex items-center gap-1.5 border border-slate-100 dark:border-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">{design.themeName}</span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight">
                        {design.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">{design.heroText}</p>
                    </div>
                    <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-0 font-medium text-[10px] whitespace-nowrap">
                      {design.niche}
                    </Badge>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-3 gap-2 mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="text-[9px] uppercase tracking-wider font-semibold text-slate-400 mb-1">Score</div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{design.conversions}</span>
                        <span className="text-[10px] font-semibold text-emerald-500">{design.trend}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wider font-semibold text-slate-400 mb-1">Revenue</div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">{design.revenue}</div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={(e) => toggleSave(design.id, e)}
                        className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                      >
                        <Bookmark className={cn("h-4 w-4", savedDesigns.includes(design.id) && "fill-violet-600 text-violet-600")} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center pt-4">
            <Button variant="outline" className="bg-white dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-700 text-violet-600 dark:text-violet-400 font-semibold h-12 px-8 hover:bg-violet-50 shadow-sm w-full sm:w-auto">
              Load More Designs
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* RIGHT COLUMN - INSIGHTS SIDEBAR */}
        <div className="w-full xl:w-[320px] shrink-0 space-y-6 sticky top-24">
          
          {/* Card 1: Design Insights */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base">
                Design Insights
                <Info className="h-4 w-4 text-slate-400" />
              </h3>
            </div>

            <div className="space-y-6">
              {/* Avg Conversion Score */}
              <div>
                <p className="text-xs text-slate-500 font-medium mb-2">Avg. Conversion Score</p>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-bold text-slate-900 dark:text-white">89</span>
                  <span className="text-sm font-semibold text-emerald-500 flex items-center">
                    <TrendingUp className="h-3.5 w-3.5 mr-1" />
                    12%
                  </span>
                </div>
                {/* Purple Trend line placeholder (visual representation) */}
                <div className="mt-4 h-12 w-full flex items-end overflow-hidden">
                  <svg viewBox="0 0 100 30" className="w-full h-full preserve-3d" preserveAspectRatio="none">
                    <path d="M0,25 C10,20 15,28 25,18 C35,8 40,22 50,15 C60,8 70,12 80,5 C90,-2 95,5 100,2 L100,30 L0,30 Z" fill="rgba(139, 92, 246, 0.1)" />
                    <path d="M0,25 C10,20 15,28 25,18 C35,8 40,22 50,15 C60,8 70,12 80,5 C90,-2 95,5 100,2" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
                <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mb-3">Top Performing Theme</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                    <AppWindow className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Dawn</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Used by 32% of top stores</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
                <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mb-3">Most Popular Style</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Minimal & Clean</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Used by 48% of top stores</p>
                  </div>
                </div>
              </div>

              <Button className="w-full bg-violet-50 hover:bg-violet-100 text-violet-700 dark:bg-violet-900/20 dark:hover:bg-violet-900/40 dark:text-violet-300 font-semibold rounded-xl h-11 shadow-none border-0">
                View Full Insights
              </Button>
            </div>
          </div>

          {/* Card 2: Top Performing Elements */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-white text-base mb-5">
              Top Performing Elements
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center group-hover:bg-violet-100 transition-colors">
                    <ShoppingCart className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Sticky Add to Cart</span>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">72%</span>
              </div>
              
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Trust Badges</span>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">68%</span>
              </div>

              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-yellow-50 text-yellow-600 flex items-center justify-center group-hover:bg-yellow-100 transition-colors">
                    <StarHalf className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Product Reviews</span>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">63%</span>
              </div>

              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                    <Truck className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Free Shipping Bar</span>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">57%</span>
              </div>

              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                    <Clock className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Urgency & Scarcity</span>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">51%</span>
              </div>
            </div>
          </div>

          {/* Card 3: Custom Store CTA */}
          <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-3xl p-6 shadow-xl shadow-violet-200/50 dark:shadow-none text-white relative overflow-hidden">
            {/* Background sparkle effects */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl rounded-full" />
            <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-indigo-400/30 blur-xl rounded-full" />
            
            <div className="relative z-10">
              <Sparkles className="h-8 w-8 text-violet-200 mb-4" />
              <h3 className="font-bold text-xl mb-2">
                Need a Custom Store?
              </h3>
              <p className="text-violet-100 text-sm leading-relaxed mb-6">
                Get a high-converting, premium Shopify store designed by experts.
              </p>
              <Button className="w-full bg-white hover:bg-slate-50 text-violet-700 font-bold rounded-xl h-11 shadow-md">
                Get Custom Store
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// Ensure AppWindow is imported for use in Design Insights
const AppWindow = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M10 4v4" />
    <path d="M2 8h20" />
    <path d="M6 4v4" />
  </svg>
);
