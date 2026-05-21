import { useState, useMemo } from 'react';
import { 
  Megaphone, Search, Play, Heart, Eye, Bookmark, ExternalLink, X, Copy, Check, 
  TrendingUp, Download, SlidersHorizontal, LayoutGrid, List, PlusCircle, ArrowRight
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { cn } from '@repo/ui/lib/utils';
import { Button } from '@repo/ui/components/ui/button';
import { Badge } from '@repo/ui/components/ui/badge';
import { Dialog, DialogContent } from '@repo/ui/components/ui/dialog';
import { 
  MOCK_AD_KPIS, MOCK_TOP_ADS, MOCK_ALL_ADS, MOCK_SIGNALS, 
  MOCK_NICHES, MOCK_SAVED_ITEMS, metaAdsDummyData 
} from './ad-library.mock';

// A tiny Sparkline component for the KPI cards and ad cards
const MiniSparkline = ({ data, colorClass = "stroke-emerald-500" }: { data: number[], colorClass?: string }) => {
  const chartData = data.map((v, i) => ({ value: v, index: i }));
  return (
    <div className="h-8 w-20">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line type="monotone" dataKey="value" stroke="currentColor" strokeWidth={2} dot={false} className={colorClass} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default function AdLibraryPage() {
  const [activeFilter, setActiveFilter] = useState('Hot Winners');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [savedAds, setSavedAds] = useState<string[]>([]);
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('8 min ago');

  const filters = [
    'Hot Winners', 'New Today', 'Ready to Scale', 'Low Saturation', 
    'High Profit', 'Rising Fast', 'Untapped', 'US Winners', 'EU Winners', 'More Filters'
  ];

  const handleRefresh = () => {
    setLastUpdated('just now');
  };

  const toggleSave = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (savedAds.includes(id)) {
      setSavedAds(savedAds.filter(item => item !== id));
    } else {
      setSavedAds([...savedAds, id]);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleExport = () => {
    // Dummy export logic
    const headers = ['ID', 'Product', 'Category', 'Price', 'Spend', 'Reach', 'Score'];
    const csvContent = [
      headers.join(','),
      ...metaAdsDummyData.map(ad => 
        `${ad.id},"${ad.productName}","${ad.creativeType}",${ad.productPrice},"${ad.estimatedSpend}","${ad.estimatedReach}",${ad.trendScore}`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'ad_library_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeAdDetails = useMemo(() => {
    if (!selectedAdId) return null;
    // In the real app, we would match by adLibraryId or similar.
    // For dummy purposes, just pick the first one or match by some logic.
    // Here we'll match by index just to show different data.
    const index = parseInt(selectedAdId.replace('ad_', '')) - 1;
    return metaAdsDummyData[index % metaAdsDummyData.length];
  }, [selectedAdId]);

  return (
    <div className="space-y-8 w-full transition-all duration-300 mx-auto pb-16">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/40 flex items-center justify-center flex-shrink-0">
            <Megaphone className="h-6 w-6 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              Discover Winning Ads
              <span className="text-xl">👑</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
              Real-time ad and product intelligence from Meta Ads Library
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-full px-3 py-1.5 shadow-xs">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">Live Data</span>
            </div>
            <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 mx-1"></div>
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Updated {lastUpdated}</span>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="icon" className="h-8 w-8 rounded-full border-slate-200 dark:border-slate-800 text-slate-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-colors">
            <PlusCircle className="h-4 w-4" /> {/* Using PlusCircle as a visual proxy or RefreshCw if available */}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* Main Content Area */}
        <div className="xl:col-span-9 space-y-8">
          
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {MOCK_AD_KPIS.map((kpi, i) => (
              <div key={i} className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center">
                    <TrendingUp className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{kpi.title}</h4>
                </div>
                <div className="mb-1">
                  <span className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">{kpi.value}</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-3">{kpi.label}</p>
                <div className="flex items-end justify-between">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{kpi.growth}</span>
                  <MiniSparkline data={kpi.trendData} />
                </div>
              </div>
            ))}
          </div>

          {/* Top Winning Ads Right Now */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="text-violet-600">✦</span> Top Winning Ads Right Now
                </h2>
                <span className="text-xs text-slate-400 hidden sm:inline-block">Based on ad spend, growth, engagement and duration</span>
              </div>
              <Button variant="ghost" className="text-xs text-violet-600 hover:text-violet-700 font-semibold flex items-center gap-1.5 h-8">
                View All <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Horizontal Scroll Area */}
            <div className="flex overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 gap-4 snap-x">
              {MOCK_TOP_ADS.map((ad) => (
                <div key={ad.id} className="min-w-[280px] w-[280px] sm:min-w-[300px] sm:w-[300px] snap-center bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-[24px] overflow-hidden flex-shrink-0 shadow-xs hover:border-violet-300 dark:hover:border-violet-800 transition-colors cursor-pointer group" onClick={() => setSelectedAdId(ad.id)}>
                  
                  <div className="aspect-[4/3] relative bg-slate-100 dark:bg-slate-800">
                    <img src={ad.image} alt={ad.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    
                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[10px] font-bold text-orange-600 dark:text-orange-400 border border-white/20 shadow-sm">
                      🔥 {ad.badge}
                    </div>
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-semibold text-white border border-white/10">
                      {ad.daysActive} Days
                    </div>
                    
                    {/* Center Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/20 text-white shadow-lg group-hover:bg-violet-600/90 group-hover:border-violet-500 transition-all">
                        <Play className="h-5 w-5 ml-1" fill="currentColor" />
                      </div>
                    </div>

                    {/* Bottom Headline Overlay */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12">
                      <p className="text-white font-bold text-sm leading-tight line-clamp-2">"{ad.headline}"</p>
                    </div>
                  </div>

                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-white line-clamp-1">{ad.title}</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{ad.category} • {ad.platform} • {ad.country}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-sm font-bold text-violet-600 dark:text-violet-400 flex-shrink-0 shadow-inner">
                      {ad.score}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Filters Section */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {filters.map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  'px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border',
                  activeFilter === filter
                    ? 'bg-violet-600 border-violet-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                )}
              >
                {filter === 'Hot Winners' ? '🔥 ' : ''}
                {filter === 'New Today' ? '🚀 ' : ''}
                {filter === 'Ready to Scale' ? '⭐ ' : ''}
                {filter === 'Low Saturation' ? '🟢 ' : ''}
                {filter === 'High Profit' ? '💰 ' : ''}
                {filter === 'Rising Fast' ? '📈 ' : ''}
                {filter === 'Untapped' ? '💎 ' : ''}
                {filter === 'US Winners' ? '🇺🇸 ' : ''}
                {filter === 'EU Winners' ? '🇪🇺 ' : ''}
                {filter === 'More Filters' ? <SlidersHorizontal className="inline-block w-3.5 h-3.5 mr-1 -mt-0.5" /> : ''}
                {filter !== 'More Filters' ? filter : 'More Filters'}
              </button>
            ))}
          </div>

          {/* All Winning Ads Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">All Winning Products</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">24,568 results found</p>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" className="h-9 rounded-xl border-slate-200 dark:border-slate-800 text-xs font-semibold">
                  <SlidersHorizontal className="h-3.5 w-3.5 mr-2" />
                  Filters <Badge className="ml-2 bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 px-1.5 py-0 text-[10px] rounded-sm">2</Badge>
                </Button>
                
                <div className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold flex items-center text-slate-700 dark:text-slate-300">
                  <span className="text-slate-400 mr-2">Sort:</span> Most Trending
                </div>

                <div className="flex p-0.5 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors', viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300')}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" /> Cards
                  </button>
                  <button 
                    onClick={() => setViewMode('table')}
                    className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors', viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300')}
                  >
                    <List className="h-3.5 w-3.5" /> Table
                  </button>
                </div>

                <Button onClick={handleExport} variant="outline" className="h-9 rounded-xl border-slate-200 dark:border-slate-800 text-xs font-semibold">
                  <Download className="h-3.5 w-3.5 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {MOCK_ALL_ADS.map((ad) => (
                  <div key={ad.id} className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-xs group hover:border-violet-300 transition-colors">
                    <div className="aspect-video relative bg-slate-100 cursor-pointer" onClick={() => setSelectedAdId(ad.id)}>
                      <img src={ad.image} alt={ad.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-2 py-0.5 rounded-md text-[9px] font-bold text-orange-600 dark:text-orange-400 border border-white/20 shadow-sm">
                        {ad.badge}
                      </div>
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded-md text-[9px] font-semibold text-white border border-white/10">
                        {ad.daysActive} Days
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/20 text-white shadow-lg">
                          <Play className="h-4 w-4 ml-0.5" fill="currentColor" />
                        </div>
                      </div>
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <div className="mb-3">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-white line-clamp-1">{ad.title}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">{ad.category} • {ad.platform} • {ad.country}</p>
                        <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 mt-1">{ad.price}</p>
                      </div>

                      <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 dark:border-slate-800 mb-3">
                        <div>
                          <p className="text-[9px] font-bold text-slate-800 dark:text-slate-200">{ad.adSpend}</p>
                          <p className="text-[8px] uppercase tracking-wider text-slate-400">Ad Spend</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-800 dark:text-slate-200">{ad.reach}</p>
                          <p className="text-[8px] uppercase tracking-wider text-slate-400">Reach</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-800 dark:text-slate-200">{ad.activeAds}</p>
                          <p className="text-[8px] uppercase tracking-wider text-slate-400">Active Ads</p>
                        </div>
                      </div>

                      <div className="flex items-end justify-between mb-4">
                        <div>
                          <p className="text-[8px] uppercase tracking-wider text-slate-400">SellerSuit Score</p>
                          <div className="flex items-end gap-1 mt-0.5">
                            <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 leading-none">{ad.score}</span>
                            <span className="text-[9px] text-slate-400 leading-none pb-0.5">/100</span>
                          </div>
                          <p className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">{ad.opportunity}</p>
                        </div>
                        <MiniSparkline data={ad.trendData} />
                      </div>

                      <div className="mt-auto pt-3 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-1">
                          <button onClick={(e) => toggleSave(ad.id, e)} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-violet-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            <Bookmark className={cn('h-3.5 w-3.5', savedAds.includes(ad.id) && 'fill-violet-600 text-violet-600')} />
                          </button>
                          <button className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-violet-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <Button onClick={() => setSelectedAdId(ad.id)} className="h-8 text-xs font-semibold rounded-lg bg-violet-600 hover:bg-violet-700 text-white flex-1 shadow-xs">
                          Analyze
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Table View */}
            {viewMode === 'table' && (
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider bg-slate-50/50 dark:bg-slate-950/20">
                        <th className="py-3 px-4 font-semibold text-slate-500">Product</th>
                        <th className="py-3 px-4 font-semibold text-slate-500">Category</th>
                        <th className="py-3 px-4 font-semibold text-slate-500 text-center">Country</th>
                        <th className="py-3 px-4 font-semibold text-slate-500 text-right">Price</th>
                        <th className="py-3 px-4 font-semibold text-slate-500 text-right">Ad Spend</th>
                        <th className="py-3 px-4 font-semibold text-slate-500 text-right">Reach</th>
                        <th className="py-3 px-4 font-semibold text-slate-500 text-center">Score</th>
                        <th className="py-3 px-4 font-semibold text-slate-500 text-center">Days Active</th>
                        <th className="py-3 px-4 font-semibold text-slate-500 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {MOCK_ALL_ADS.map((ad) => (
                        <tr key={ad.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSelectedAdId(ad.id)}>
                              <img src={ad.image} alt={ad.title} className="w-8 h-8 rounded-lg object-cover" />
                              <div>
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{ad.title}</p>
                                <p className="text-[10px] text-slate-400 line-clamp-1">{ad.headline}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">{ad.category}</td>
                          <td className="py-3 px-4 text-center text-xs text-slate-600 dark:text-slate-400">{ad.country}</td>
                          <td className="py-3 px-4 text-right text-xs font-semibold text-slate-800 dark:text-slate-200">{ad.price}</td>
                          <td className="py-3 px-4 text-right text-xs text-slate-600 dark:text-slate-400">{ad.adSpend}</td>
                          <td className="py-3 px-4 text-right text-xs text-slate-600 dark:text-slate-400">{ad.reach}</td>
                          <td className="py-3 px-4 text-center text-xs font-extrabold text-emerald-600 dark:text-emerald-400">{ad.score}</td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant="outline" className="text-[10px] bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                              {ad.daysActive}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button onClick={() => setSelectedAdId(ad.id)} size="sm" className="h-7 text-[10px] font-semibold bg-violet-600 text-white rounded-lg">
                              Analyze
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="xl:col-span-3 space-y-6">
          
          {/* Live Market Signals */}
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Live Market Signals</h3>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Live</span>
              </div>
            </div>
            <div className="p-4 space-y-4 max-h-[300px] overflow-y-auto scrollbar-hide">
              {MOCK_SIGNALS.map((signal, i) => (
                <div key={i} className="flex gap-3">
                  <div className="mt-0.5 w-2 h-2 rounded-full bg-violet-200 dark:bg-violet-900 border border-violet-400 dark:border-violet-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-tight">{signal.text}</p>
                    <p className="text-[9px] text-slate-400 mt-1">{signal.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <button className="w-full text-[10px] font-semibold text-violet-600 hover:text-violet-700 flex items-center justify-center gap-1">
                View All Signals <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Trending Niches */}
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Trending Niches</h3>
              <span className="text-[10px] text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">This Week</span>
            </div>
            <div className="p-4 space-y-3">
              {MOCK_NICHES.map((niche, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{niche.name}</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{niche.growth}</span>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <button className="w-full text-[10px] font-semibold text-violet-600 hover:text-violet-700 flex items-center justify-center gap-1">
                View All Niches <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* AI Product Finder Promo */}
          <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
            <div className="flex items-center justify-between mb-3 relative z-10">
              <h3 className="text-sm font-bold">AI Product Finder</h3>
              <Badge className="bg-white/20 hover:bg-white/30 text-white border-none text-[9px] px-1.5 py-0">BETA</Badge>
            </div>
            <p className="text-xs text-white/80 leading-relaxed mb-4 relative z-10">
              Find untapped winning products with low competition and high profit potential.
            </p>
            <Button className="w-full bg-white text-violet-700 hover:bg-slate-50 text-xs font-bold h-9 rounded-xl shadow-sm relative z-10">
              Find Products with AI <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </div>

          {/* Recently Saved */}
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Recently Saved</h3>
              <button className="text-[10px] font-semibold text-violet-600 hover:text-violet-700">View All</button>
            </div>
            <div className="p-4 space-y-3">
              {MOCK_SAVED_ITEMS.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 border border-slate-200 dark:border-slate-700">
                    <Bookmark className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 line-clamp-1">{item.name}</h4>
                    <p className="text-[9px] text-slate-400">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </div>

      {/* Ad Analysis Dialog */}
      <Dialog open={!!selectedAdId} onOpenChange={(open) => !open && setSelectedAdId(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-3xl gap-0">
          {activeAdDetails && (
            <div className="grid grid-cols-1 md:grid-cols-2 h-full">
              {/* Left Media Column */}
              <div className="bg-slate-950 p-6 flex flex-col justify-between text-white min-h-[300px] md:min-h-full relative">
                <button onClick={() => setSelectedAdId(null)} className="md:hidden absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full z-10">
                  <X className="h-4 w-4" />
                </button>
                <Badge className="w-fit bg-white/20 text-white font-bold border-none text-[9px] rounded-lg">
                  {activeAdDetails.platform} • {activeAdDetails.creativeType}
                </Badge>
                <div className="text-center py-10 flex-1 flex flex-col justify-center">
                  <div className="w-20 h-20 mx-auto rounded-full bg-white/10 flex items-center justify-center mb-4">
                    <Play className="h-8 w-8 ml-1" />
                  </div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-4">Simulated Media Player</p>
                </div>
                <div className="space-y-1.5">
                  <div className="w-full bg-white/20 h-1 rounded-full">
                    <div className="bg-violet-500 h-full rounded-full w-2/3" />
                  </div>
                  <div className="flex justify-between text-[8px] text-slate-450">
                    <span>0:08</span>
                    <span>0:15</span>
                  </div>
                </div>
              </div>

              {/* Right Data Column */}
              <div className="p-6 flex flex-col relative h-[500px] overflow-y-auto">
                <button onClick={() => setSelectedAdId(null)} className="hidden md:flex absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X className="h-5 w-5" />
                </button>
                
                <div className="mb-6 pr-8">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mb-1">{activeAdDetails.headline}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Promoting: {activeAdDetails.productName}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Ad Spend</p>
                    <p className="text-lg font-bold text-slate-800 dark:text-white">{activeAdDetails.estimatedSpend}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Score</p>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{activeAdDetails.trendScore}</p>
                  </div>
                </div>

                <div className="space-y-5 flex-1">
                  <div>
                    <h3 className="text-[10px] font-bold uppercase text-slate-400 mb-2">Ad Copy</h3>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 relative group">
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pr-8">"{activeAdDetails.adCopy}"</p>
                      <button onClick={() => copyToClipboard(activeAdDetails.adCopy)} className="absolute top-2 right-2 p-1.5 rounded-md text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        {copiedText ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[10px] font-bold uppercase text-slate-400 mb-2">Targeting & Platform</h3>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-[10px] font-medium bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">{activeAdDetails.platform}</Badge>
                      <Badge variant="outline" className="text-[10px] font-medium bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">Country: {activeAdDetails.country}</Badge>
                      <Badge variant="outline" className="text-[10px] font-medium bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">{activeAdDetails.detectedStorePlatform}</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3 text-xs">
                    <div>
                      <span className="text-slate-500">Active Days:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 ml-2">{activeAdDetails.daysActive}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Variations:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 ml-2">{activeAdDetails.activeVariations}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Saturation:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 ml-2">{activeAdDetails.saturationLevel}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Competition:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 ml-2">{activeAdDetails.competitionLevel}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-4 border-t border-slate-100 dark:border-slate-800">
                  {/* FUTURE TODO: Replace Meta Ads dummy data with real API integration */}
                  <a href={activeAdDetails.landingPageUrl} target="_blank" rel="noopener noreferrer" className="w-full h-11 bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-sm text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
                    {activeAdDetails.callToAction} <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
