import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Sparkles, 
  TrendingUp, 
  DollarSign, 
  Percent, 
  AlertTriangle, 
  Check, 
  ArrowRight,
  Database,
  BarChart3,
  ShieldCheck
} from "lucide-react";

interface ProductPreset {
  keyword: string;
  sellThrough: string;
  avgPrice: number;
  successfulListings: string;
  totalRevenue: number;
  competitors: {
    title: string;
    supplierPrice: number;
    ebayPrice: number;
    shipping: number;
    profit: number;
    supplier: "Amazon" | "Walmart";
    soldCount: number;
  }[];
  keywords: { phrase: string; searchVolume: number; competition: "Low" | "Medium" | "High" }[];
}

const PRESETS: Record<string, ProductPreset> = {
  "gym leggings": {
    keyword: "gym leggings",
    sellThrough: "1,480%",
    avgPrice: 22.99,
    successfulListings: "86%",
    totalRevenue: 24350,
    competitors: [
      {
        title: "High Waisted Gym Leggings with Pockets - Squat Proof",
        supplierPrice: 9.99,
        ebayPrice: 22.99,
        shipping: 3.99,
        profit: 6.94,
        supplier: "Amazon",
        soldCount: 342
      },
      {
        title: "Seamless Workout Leggings Activewear Tights",
        supplierPrice: 12.50,
        ebayPrice: 26.50,
        shipping: 0,
        profit: 9.61,
        supplier: "Walmart",
        soldCount: 189
      }
    ],
    keywords: [
      { phrase: "high waisted yoga pants", searchVolume: 12400, competition: "Medium" },
      { phrase: "squat proof leggings pockets", searchVolume: 8900, competition: "Low" },
      { phrase: "seamless gym tights compression", searchVolume: 5400, competition: "Low" }
    ]
  },
  "wireless charger": {
    keyword: "wireless charger",
    sellThrough: "920%",
    avgPrice: 18.50,
    successfulListings: "78%",
    totalRevenue: 15900,
    competitors: [
      {
        title: "3-in-1 Fast Wireless Charging Station for iPhone & Watch",
        supplierPrice: 14.99,
        ebayPrice: 29.99,
        shipping: 4.99,
        profit: 6.02,
        supplier: "Amazon",
        soldCount: 520
      },
      {
        title: "Qi-Certified 15W Super Fast Wireless Charger Pad",
        supplierPrice: 6.50,
        ebayPrice: 16.99,
        shipping: 2.99,
        profit: 5.24,
        supplier: "Walmart",
        soldCount: 290
      }
    ],
    keywords: [
      { phrase: "fast charging stand dock", searchVolume: 15200, competition: "High" },
      { phrase: "3 in 1 charging station apple", searchVolume: 11500, competition: "Medium" },
      { phrase: "qi wireless charger pad 15w", searchVolume: 6100, competition: "Low" }
    ]
  },
  "dog bed": {
    keyword: "dog bed",
    sellThrough: "1,150%",
    avgPrice: 34.99,
    successfulListings: "82%",
    totalRevenue: 31200,
    competitors: [
      {
        title: "Orthopedic Memory Foam Dog Bed with Removable Cover",
        supplierPrice: 19.99,
        ebayPrice: 39.99,
        shipping: 5.99,
        profit: 8.70,
        supplier: "Amazon",
        soldCount: 215
      },
      {
        title: "Calming Donut Cuddler Plush Dog Bed Washable",
        supplierPrice: 14.50,
        ebayPrice: 32.99,
        shipping: 3.99,
        profit: 10.12,
        supplier: "Walmart",
        soldCount: 164
      }
    ],
    keywords: [
      { phrase: "orthopedic memory foam bed", searchVolume: 9800, competition: "Medium" },
      { phrase: "calming donut cuddler small", searchVolume: 7400, competition: "Low" },
      { phrase: "washable dog mattress plush", searchVolume: 4200, competition: "Low" }
    ]
  }
};

export default function ResearchSimulator() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [results, setResults] = useState<ProductPreset | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const loaderSteps = [
    "Connecting to eBay API and scraping search results...",
    "Analyzing competitor listings & historical sales volume...",
    "Scanning Amazon & Walmart for matching supplier items...",
    "Generating profitable keyword options and title structure..."
  ];

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setLoadStep((prev) => {
          if (prev >= loaderSteps.length - 1) {
            clearInterval(interval);
            setIsLoading(false);
            const key = query.toLowerCase().trim();
            const matchedPreset = PRESETS[key] || PRESETS["gym leggings"];
            setResults({
              ...matchedPreset,
              keyword: query || matchedPreset.keyword
            });
            return 0;
          }
          return prev + 1;
        });
      }, 850);
      return () => clearInterval(interval);
    }
  }, [isLoading, query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setHasSearched(true);
    setResults(null);
  };

  const handleSelectPreset = (presetKey: string) => {
    setQuery(presetKey);
    setIsLoading(true);
    setHasSearched(true);
    setResults(null);
  };

  const formattedUSD = (val: number) => 
    val.toLocaleString("en-US", { style: "currency", currency: "USD" });

  return (
    <section id="research-simulator" className="scroll-mt-24 border-b border-border bg-secondary/10 py-20 sm:py-24">
      <div className="container px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Market Intelligence</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
            Spy on competitors. Find hot items in seconds.
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Type any product keyword to analyze the eBay market, estimate sell-through metrics, and locate matching products to source.
          </p>
        </div>

        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-soft-xl">
            {/* Search Input Box */}
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Try 'gym leggings', 'wireless charger', 'dog bed'..."
                  value={query}
                  disabled={isLoading}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-secondary/20 pl-11 pr-4 text-sm font-medium transition-all focus:border-primary/50 focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/25 text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="h-12 shrink-0 flex items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-white hover:bg-primary/95 transition-all shadow-glow-primary active:scale-98"
              >
                <Database className="h-4 w-4" />
                Analyze Market
              </button>
            </form>

            {/* Quick Presets */}
            {!hasSearched && (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground">Popular ideas:</span>
                {Object.keys(PRESETS).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className="rounded-full border border-border/60 bg-secondary/30 px-3 py-1 font-semibold text-muted-foreground hover:bg-primary/10 hover:border-primary/45 hover:text-primary transition-all"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            )}

            {/* Content Area */}
            <div className="mt-6 border-t border-border/40 pt-6 min-h-[200px] flex items-center justify-center relative">
              <AnimatePresence mode="wait">
                {/* Initial State */}
                {!hasSearched && !isLoading && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center py-10 max-w-sm"
                  >
                    <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/30" />
                    <h4 className="mt-3 text-sm font-bold text-foreground">Waiting for analysis</h4>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      Use the search input above or select one of our popular presets to start analyzing real-time arbitrage data.
                    </p>
                  </motion.div>
                )}

                {/* Loading State */}
                {isLoading && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center py-10 w-full max-w-md"
                  >
                    <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary animate-bounce">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <h4 className="mt-4 text-sm font-bold text-foreground">Market Analyzer is running...</h4>
                    <p className="mt-2 text-xs text-muted-foreground italic h-4 truncate">
                      {loaderSteps[loadStep]}
                    </p>
                    <div className="mt-4 h-1.5 w-full bg-secondary overflow-hidden rounded-full">
                      <div 
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${((loadStep + 1) / loaderSteps.length) * 100}%` }}
                      />
                    </div>
                  </motion.div>
                )}

                {/* Results State */}
                {results && !isLoading && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="w-full text-left space-y-6"
                  >
                    {/* Metrics Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="rounded-xl border border-border bg-secondary/10 p-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sell-Through</span>
                        <div className="mt-1 flex items-baseline gap-1.5">
                          <span className="font-display text-xl font-bold text-foreground">{results.sellThrough}</span>
                          <span className="rounded bg-success/15 px-1 py-0.5 text-[8px] font-bold text-success flex items-center gap-0.5">
                            <TrendingUp className="h-2 w-2" /> HOT
                          </span>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border bg-secondary/10 p-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Avg Price</span>
                        <div className="mt-1">
                          <span className="font-display text-xl font-bold text-foreground">{formattedUSD(results.avgPrice)}</span>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border bg-secondary/10 p-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Listing Success</span>
                        <div className="mt-1">
                          <span className="font-display text-xl font-bold text-foreground">{results.successfulListings}</span>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border bg-secondary/10 p-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sales/Month</span>
                        <div className="mt-1">
                          <span className="font-display text-xl font-bold text-foreground">{formattedUSD(results.totalRevenue)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Sourcing Section */}
                    <div>
                      <h4 className="font-display text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
                        <ShieldCheck className="h-4.5 w-4.5 text-success" />
                        Top Sourcing Recommendations (Supplier → eBay)
                      </h4>

                      <div className="grid gap-4 md:grid-cols-2">
                        {results.competitors.map((item, index) => (
                          <div key={index} className="rounded-xl border border-border/80 bg-card p-4 hover:border-primary/30 transition-all flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">
                                  Source: {item.supplier}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-semibold">
                                  Sold: {item.soldCount} units
                                </span>
                              </div>
                              <h5 className="text-xs font-bold text-foreground leading-5 truncate">{item.title}</h5>

                              <div className="mt-3 grid grid-cols-3 gap-2 border-y border-border/40 py-2.5 text-center text-xs">
                                <div>
                                  <span className="block text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Cost</span>
                                  <span className="font-bold text-foreground">{formattedUSD(item.supplierPrice)}</span>
                                </div>
                                <div>
                                  <span className="block text-[8px] font-bold uppercase tracking-wider text-muted-foreground">eBay Sell</span>
                                  <span className="font-bold text-foreground">{formattedUSD(item.ebayPrice)}</span>
                                </div>
                                <div>
                                  <span className="block text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Net Margin</span>
                                  <span className="font-bold text-success">+{formattedUSD(item.profit)}</span>
                                </div>
                              </div>
                            </div>

                            <a
                              href="/register"
                              className="mt-4 w-full flex items-center justify-center gap-1.5 rounded-lg bg-secondary py-2 text-xs font-bold text-foreground hover:bg-primary hover:text-white transition-all"
                            >
                              List this item
                              <ArrowRight className="h-3 w-3" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Hot Keywords */}
                    <div className="rounded-xl border border-border/60 bg-secondary/5 p-4">
                      <h4 className="font-display text-sm font-bold text-foreground mb-3">Recommended eBay Title Keywords</h4>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {results.keywords.map((kw, index) => (
                          <div key={index} className="flex justify-between items-center rounded-lg border border-border/40 bg-card px-3 py-2 text-xs">
                            <span className="font-medium text-foreground truncate max-w-[120px]">{kw.phrase}</span>
                            <span className="rounded bg-secondary/80 px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                              Vol: {kw.searchVolume.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
