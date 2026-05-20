import { useState } from 'react';
import { Sparkles, Copy, Check, Bookmark, Send, RefreshCw, PenTool, LayoutTemplate } from 'lucide-react';
import { ShopifyPageShell } from '@/components/shopify/ShopifyPageShell';
import { Button } from '@repo/ui/components/ui/button';
import { Badge } from '@repo/ui/components/ui/badge';
import { cn } from '@repo/ui/lib/utils';

export default function AiCopyStudio() {
  const [generatorType, setGeneratorType] = useState<'ad' | 'product'>('ad');
  const [productName, setProductName] = useState('Portable Blender Pro');
  const [tone, setTone] = useState('Persuasive');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Pre-filled simulation results
  const adTemplates = [
    {
      hook: "Blend anywhere, fresh everywhere. 🥤",
      body: "Stop drinking warm, clumpy shakes. The Portable Blender Pro packs USB-rechargeable power to blitz frozen fruit, ice, and protein powders in 20 seconds flat. Leak-proof, self-cleaning, and fits in any cup holder.",
      cta: "Shop 50% Off Today 👇",
    },
    {
      hook: "Your entire smoothie bar, in your gym bag. 💪",
      body: "Ditch the bulky countertop blender. Our cordless design delivers 15+ blends on a single charge. Whether you are at the gym, office, or hiking, fresh nutrition is one button away. Order yours now.",
      cta: "Claim Free Shipping Here ✈️",
    }
  ];

  const productTemplates = [
    {
      title: "Portable Blender Pro - Cordless Personal Smoothie Maker",
      description: "Upgrade your nutrition on the go. The Portable Blender Pro is engineered to crush ice and frozen fruits with six stainless steel blades, delivering smooth texturing in seconds. Designed for active lifestyles, it features a built-in handle, USB-C recharging, and an auto-clean cycle.",
      highlights: "• Six-blade stainless steel assembly\n• 15+ blends per charge (USB-C rechargeable)\n• BPA-free lightweight polymer container\n• Single-button automatic cleaning cycle",
    }
  ];

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
    }, 800);
  };

  const copyText = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <ShopifyPageShell
      icon={Sparkles}
      title="AI Copy Studio"
      description="Write persuasive sales copy, high-converting social ad hooks, and SEO-optimized product catalogs customized for dropshipping."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Input parameters */}
        <div className="lg:col-span-5 space-y-6">
          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-3xl p-6 shadow-xs space-y-6">
            
            {/* Studio Mode Selector */}
            <div className="space-y-2">
              <label className="text-[10px] text-slate-450 uppercase font-semibold">Studio Mode</label>
              <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800">
                <button
                  onClick={() => setGeneratorType('ad')}
                  className={cn(
                    'py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5',
                    generatorType === 'ad'
                      ? 'bg-white dark:bg-slate-850 text-violet-750 dark:text-violet-300 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  )}
                >
                  <LayoutTemplate className="h-3.5 w-3.5" />
                  Ad Copy
                </button>
                <button
                  onClick={() => setGeneratorType('product')}
                  className={cn(
                    'py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5',
                    generatorType === 'product'
                      ? 'bg-white dark:bg-slate-850 text-violet-750 dark:text-violet-350 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  )}
                >
                  <PenTool className="h-3.5 w-3.5" />
                  Product Copy
                </button>
              </div>
            </div>

            {/* Product Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-455 uppercase font-semibold">Product Name or Niche</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition-all font-medium"
              />
            </div>

            {/* Tone Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-455 uppercase font-semibold">Voice Tone</label>
              <div className="flex flex-wrap gap-1.5">
                {['Persuasive', 'Creative', 'Professional', 'Bold'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-[10px] font-semibold border transition-all',
                      tone === t
                        ? 'bg-violet-50 dark:bg-violet-950 border-violet-200 text-violet-750 dark:text-violet-300 font-bold'
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate CTA */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-11 text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating Workspace Copy...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Generate Studio Set
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right Side: Generated Output Preview */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Studio Outputs</h3>
            <Badge variant="outline" className="bg-violet-50 dark:bg-violet-950/20 text-violet-700 dark:text-violet-300 border-none font-semibold text-[10px]">
              AI Generation Active
            </Badge>
          </div>

          {generatorType === 'ad' ? (
            <div className="space-y-4">
              {adTemplates.map((ad, idx) => (
                <div
                  key={idx}
                  className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-3xl p-5 shadow-xs space-y-4"
                >
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-slate-850">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Option {idx + 1}</span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => copyText(`${ad.hook}\n\n${ad.body}\n\n${ad.cta}`, idx)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650 transition-colors"
                      >
                        {copiedIndex === idx ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3.5 text-xs leading-relaxed font-normal text-slate-700 dark:text-slate-350">
                    <p className="font-bold text-slate-950 dark:text-white">{ad.hook}</p>
                    <p>{ad.body}</p>
                    <p className="font-semibold text-violet-600 dark:text-violet-400">{ad.cta}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {productTemplates.map((prod, idx) => (
                <div
                  key={idx}
                  className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-3xl p-5 shadow-xs space-y-4"
                >
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-slate-850">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Optimized Catalog Copy</span>
                    <button
                      onClick={() => copyText(`${prod.title}\n\n${prod.description}\n\n${prod.highlights}`, 99)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650 transition-colors"
                    >
                      {copiedIndex === 99 ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  <div className="space-y-4 text-xs leading-relaxed font-normal text-slate-700 dark:text-slate-350">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400">SEO Optimized Title</span>
                      <p className="font-bold text-slate-950 dark:text-white mt-1">{prod.title}</p>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400">Product Description</span>
                      <p className="mt-1">{prod.description}</p>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400">Bullet Points & Specs</span>
                      <p className="whitespace-pre-line mt-1">{prod.highlights}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </ShopifyPageShell>
  );
}
