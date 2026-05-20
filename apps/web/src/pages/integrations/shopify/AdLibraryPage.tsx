import { useState } from 'react';
import { Megaphone, Search, Play, Heart, Eye, Bookmark, ExternalLink, X, Copy, Check, Info } from 'lucide-react';
import { ShopifyPageShell } from '@/components/shopify/ShopifyPageShell';
import { MOCK_AD_WINNERS, type AdWinner } from './shopify.mock';
import { cn } from '@repo/ui/lib/utils';
import { Button } from '@repo/ui/components/ui/button';
import { Badge } from '@repo/ui/components/ui/badge';

export default function AdLibraryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('All');
  const [activeAd, setActiveAd] = useState<AdWinner | null>(null);
  const [savedAds, setSavedAds] = useState<string[]>(['1']);
  const [copiedText, setCopiedText] = useState(false);

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

  const platforms = ['All', 'TikTok', 'Facebook', 'Instagram'];

  const filteredAds = MOCK_AD_WINNERS.filter(ad => {
    const matchesSearch = ad.hookText.toLowerCase().includes(searchTerm.toLowerCase()) || ad.angle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlatform = selectedPlatform === 'All' || ad.platform.toLowerCase() === selectedPlatform.toLowerCase();
    return matchesSearch && matchesPlatform;
  });

  return (
    <ShopifyPageShell
      icon={Megaphone}
      title="Ad Library"
      description="Inspect running competitor advertisements. Research high-converting hook copy, angles, format distribution, and engagement metrics."
    >
      <div className="space-y-6">
        {/* Search & Platform Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="flex gap-1.5 overflow-x-auto">
            {platforms.map((platform) => (
              <button
                key={platform}
                onClick={() => setSelectedPlatform(platform)}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all',
                  selectedPlatform === platform
                    ? 'bg-violet-600 border-violet-600 text-white shadow-xs'
                    : 'bg-transparent border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                {platform}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search hook copy or angle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-350 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition-all"
            />
          </div>
        </div>

        {/* Ads Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAds.map((ad) => (
            <div
              key={ad.id}
              onClick={() => setActiveAd(ad)}
              className="group border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-3xl overflow-hidden hover:border-violet-300 dark:hover:border-violet-900/50 transition-all duration-250 cursor-pointer flex flex-col justify-between shadow-xs"
            >
              {/* Card visual player */}
              <div className="aspect-video bg-slate-50 dark:bg-slate-950 flex items-center justify-center relative border-b border-slate-100 dark:border-slate-850">
                <span className="text-4xl">{ad.thumbnail}</span>
                
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-xs px-2.5 py-0.5 rounded-lg text-[9px] text-white font-semibold border border-white/10">
                  <span>{ad.platform}</span>
                </div>

                <button
                  onClick={(e) => toggleSave(ad.id, e)}
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/50 border border-white/5 text-slate-300 hover:text-white hover:bg-black/75 transition-colors z-10"
                >
                  <Bookmark className={cn('h-3.5 w-3.5', savedAds.includes(ad.id) && 'fill-violet-550 text-violet-550')} />
                </button>

                {/* Hover Play icon */}
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md">
                    <Play className="h-5 w-5 text-violet-600 ml-0.5" fill="currentColor" />
                  </div>
                </div>
              </div>

              {/* Hook text & metrics */}
              <div className="p-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed line-clamp-2">
                    "{ad.hookText}"
                  </p>
                  <Badge variant="outline" className="mt-2 text-[9px] font-bold px-2 py-0.5 rounded-md text-violet-700 bg-violet-50/50 dark:text-violet-300 dark:bg-violet-950/20 border-violet-100/30 dark:border-violet-900/30">
                    {ad.angle}
                  </Badge>
                </div>

                <div className="flex items-center justify-between mt-3 text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {ad.views} Views</span>
                  <span className="flex items-center gap-1"><Heart className="h-3 w-3 text-red-500/80" /> {ad.likes} Likes</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Ad Inspection Video Modal */}
        {activeAd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
              <button
                onClick={() => {
                  setActiveAd(null);
                  setCopiedText(false);
                }}
                className="absolute top-4 right-4 p-2 bg-slate-50 dark:bg-slate-850 hover:bg-slate-105 text-slate-400 hover:text-slate-655 rounded-full z-10 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Simulated Player */}
                <div className="p-6 bg-slate-950 flex flex-col justify-between text-white min-h-[280px]">
                  <Badge className="w-fit bg-white/20 text-white font-bold border-none text-[9px] rounded-lg">
                    {activeAd.platform} Creative
                  </Badge>
                  <div className="text-center py-6">
                    <span className="text-5xl">{activeAd.thumbnail}</span>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-4">Simulated Ad Playback</p>
                  </div>
                  {/* Progress bar */}
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

                {/* Hook and copywriting copy studio info */}
                <div className="p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-3.5">
                    <div>
                      <span className="text-[9px] text-slate-450 uppercase font-semibold">Creative Hook Text</span>
                      <div className="flex items-start gap-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 mt-1">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-250 leading-relaxed flex-1">
                          "{activeAd.hookText}"
                        </p>
                        <button
                          onClick={() => copyToClipboard(activeAd.hookText)}
                          className="p-1.5 hover:bg-slate-200/50 dark:hover:bg-slate-900 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {copiedText ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[9px] text-slate-450 uppercase font-semibold">Advertising Angle</span>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-350 mt-0.5">{activeAd.angle}</p>
                    </div>

                    <div>
                      <span className="text-[9px] text-slate-450 uppercase font-semibold">Audience Keywords</span>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <Badge variant="outline" className="text-[8px] bg-slate-50 dark:bg-slate-950 text-slate-500 border-slate-200">
                          USA
                        </Badge>
                        <Badge variant="outline" className="text-[8px] bg-slate-50 dark:bg-slate-950 text-slate-500 border-slate-200">
                          TikTok Feed
                        </Badge>
                        <Badge variant="outline" className="text-[8px] bg-slate-50 dark:bg-slate-950 text-slate-500 border-slate-200">
                          Gadgets
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <a
                      href="https://facebook.com/ads/library"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-violet-650 hover:bg-violet-700 text-white rounded-xl shadow-xs text-xs font-semibold py-2.5 h-10 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      Browse Platform Ad Library
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ShopifyPageShell>
  );
}
