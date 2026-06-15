import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Check, 
  Chrome, 
  Zap, 
  TrendingUp 
} from "lucide-react";

export default function ExtensionSimulator() {
  const [markup, setMarkup] = useState(35); // markup %
  const [isListing, setIsListing] = useState(false);
  const [listingStep, setListingStep] = useState(0);
  const [isListed, setIsListed] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<"amazon" | "walmart">("amazon");

  // Math variables
  const cost = selectedSupplier === "amazon" ? 79.99 : 54.50;
  const shipping = 4.99;
  const feePct = 13.25;

  const markupAmount = cost * (markup / 100);
  // Formula: Sell Price = (Cost + Markup + Shipping) / (1 - feePct/100)
  const sellPrice = (cost + markupAmount + shipping) / (1 - feePct / 100);
  const fees = sellPrice * (feePct / 100);
  const netProfit = sellPrice - cost - fees - shipping;

  const steps = [
    "Analyzing supplier details...",
    "Building optimized titles & images...",
    "Generating SKU structure...",
    "Publishing active listing to eBay..."
  ];

  useEffect(() => {
    if (isListing) {
      const interval = setInterval(() => {
        setListingStep((prev) => {
          if (prev >= steps.length - 1) {
            clearInterval(interval);
            setIsListing(false);
            setIsListed(true);
            return steps.length;
          }
          return prev + 1;
        });
      }, 900);
      return () => clearInterval(interval);
    }
  }, [isListing]);

  const handleStartListing = () => {
    if (isListed) {
      setIsListed(false);
      setListingStep(0);
      return;
    }
    setIsListing(true);
    setListingStep(0);
  };

  const formattedUSD = (val: number) => 
    val.toLocaleString("en-US", { style: "currency", currency: "USD" });

  return (
    <div className="w-full select-none font-sans text-left">
      <div className="grid overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft-xl md:grid-cols-5">
        {/* Left: Supplier Page Mockup */}
        <div className="md:col-span-3 border-r border-border/50 bg-secondary/20 p-5 md:p-6 flex flex-col justify-between">
          <div>
            {/* Header: Browser Bar */}
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-card/60 px-3 py-1.5 border border-border/40 text-[10px] sm:text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-destructive/60" />
              <span className="h-2 w-2 rounded-full bg-warning/60" />
              <span className="h-2 w-2 rounded-full bg-success/60" />
              <div className="mx-2 flex-1 rounded bg-secondary/80 px-2 py-0.5 text-center text-[10px] truncate">
                {selectedSupplier === "amazon" 
                  ? "https://www.amazon.com/dp/B08GP8E123" 
                  : "https://www.walmart.com/ip/882194121"}
              </div>
            </div>

            {/* Supplier Selector Chips */}
            <div className="mb-5 flex gap-2">
              <button 
                onClick={() => { setSelectedSupplier("amazon"); setIsListed(false); setListingStep(0); }}
                className={`rounded px-2.5 py-1 text-xs font-semibold border transition-all ${
                  selectedSupplier === "amazon" 
                    ? "bg-card border-primary/50 text-foreground shadow-sm" 
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Amazon.com
              </button>
              <button 
                onClick={() => { setSelectedSupplier("walmart"); setIsListed(false); setListingStep(0); }}
                className={`rounded px-2.5 py-1 text-xs font-semibold border transition-all ${
                  selectedSupplier === "walmart" 
                    ? "bg-card border-primary/50 text-foreground shadow-sm" 
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Walmart.com
              </button>
            </div>

            {/* Product Card */}
            <div className="flex gap-4">
              <div className="h-24 w-24 sm:h-28 sm:w-28 shrink-0 rounded-xl bg-card border border-border/60 p-2 flex items-center justify-center relative overflow-hidden">
                {/* Simulated chair/appliance using SVGs */}
                <svg viewBox="0 0 100 100" className="h-20 w-20 text-muted-foreground/40" fill="currentColor">
                  {selectedSupplier === "amazon" ? (
                    // Office Chair shape
                    <g>
                      <rect x="35" y="15" width="30" height="30" rx="4" />
                      <rect x="45" y="45" width="10" height="20" />
                      <line x1="25" y1="45" x2="75" y2="45" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                      <line x1="30" y1="65" x2="70" y2="65" stroke="currentColor" strokeWidth="4" />
                      <line x1="50" y1="65" x2="50" y2="80" stroke="currentColor" strokeWidth="6" />
                      <circle cx="35" cy="82" r="4" />
                      <circle cx="50" cy="82" r="4" />
                      <circle cx="65" cy="82" r="4" />
                    </g>
                  ) : (
                    // Household appliance / Blender shape
                    <g>
                      <path d="M35,20 L65,20 L60,60 L40,60 Z" />
                      <rect x="30" y="60" width="40" height="20" rx="3" />
                      <circle cx="50" cy="70" r="4" fill="white" />
                    </g>
                  )}
                </svg>
                <span className="absolute bottom-1 right-1 rounded bg-secondary px-1 text-[8px] font-bold">
                  {selectedSupplier === "amazon" ? "B08GP8" : "WM-8821"}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary tracking-wide">
                  BEST SELLER
                </span>
                <h4 className="mt-1 font-display text-xs sm:text-sm font-semibold text-foreground truncate">
                  {selectedSupplier === "amazon" 
                    ? "Ergonomic Office Chair with 3D Lumbar Support" 
                    : "High-Performance 1000W Professional Blender"}
                </h4>
                <div className="mt-1 flex items-center gap-1.5">
                  <div className="flex text-amber-500 text-xs">★★★★★</div>
                  <span className="text-[10px] text-muted-foreground">(4,820 reviews)</span>
                </div>
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className="font-display text-base sm:text-lg font-bold text-foreground">
                    {formattedUSD(cost)}
                  </span>
                  <span className="text-[10px] text-success font-medium">In Stock</span>
                </div>
              </div>
            </div>
          </div>

          {/* Supplier Info Footer */}
          <div className="mt-6 border-t border-border/40 pt-4 flex items-center justify-between text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              <span>SellerSuit Extension Active on page</span>
            </div>
            <span>v2.4.1</span>
          </div>
        </div>

        {/* Right: SellerSuit Chrome Extension Panel Mockup */}
        <div className="md:col-span-2 bg-card p-5 md:p-6 flex flex-col justify-between border-t md:border-t-0 border-border/50">
          <div>
            {/* Ext Header */}
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-6 w-6 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Chrome className="h-3.5 w-3.5" />
                </div>
                <span className="font-display text-xs font-bold text-foreground tracking-tight">
                  SellerSuit
                </span>
              </div>
              <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-[8px] font-bold text-success">
                CONNECTED
              </span>
            </div>

            {/* Ext Sidebar Tabs */}
            <div className="mb-4 flex border-b border-border/40 pb-1 text-[10px] font-semibold text-muted-foreground gap-3">
              <span className="text-primary border-b border-primary pb-1">Listing</span>
              <span>Variations</span>
              <span>Settings</span>
            </div>

            {/* Form Fields inside extension */}
            <div className="space-y-4">
              {/* Product Title */}
              <div>
                <label className="mb-1 block text-[10px] font-medium text-muted-foreground">
                  eBay Title (SEO Optimized)
                </label>
                <div className="flex items-center gap-1 rounded bg-secondary/35 px-2 py-1 text-[10px] border border-border/40">
                  <span className="text-muted-foreground truncate flex-1">
                    {selectedSupplier === "amazon" 
                      ? "Ergonomic Office Chair 3D Lumbar Support Mesh Adjustable Desk" 
                      : "Professional Blender 1000W Countertop High Speed Smoothie"}
                  </span>
                </div>
              </div>

              {/* SKU Generator */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted-foreground">
                    Custom SKU
                  </label>
                  <div className="rounded bg-secondary/35 px-2 py-1 text-[10px] font-mono border border-border/40 text-foreground">
                    {selectedSupplier === "amazon" ? "SLR-AMZ-B08G" : "SLR-WMT-8821"}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted-foreground">
                    Supplier Cost
                  </label>
                  <div className="rounded bg-secondary/35 px-2 py-1 text-[10px] font-semibold border border-border/40 text-foreground">
                    {formattedUSD(cost)}
                  </div>
                </div>
              </div>

              {/* Slider for Margin Markup */}
              <div className="rounded-xl border border-border/40 bg-secondary/15 p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-medium text-muted-foreground">Target Markup</span>
                  <span className="text-[10px] font-bold text-primary">{markup}%</span>
                </div>
                <input 
                  type="range" 
                  min="15" 
                  max="75" 
                  step="1"
                  value={markup}
                  disabled={isListing}
                  onChange={(e) => {
                    setMarkup(parseInt(e.target.value));
                    setIsListed(false);
                    setListingStep(0);
                  }}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
                />
              </div>

              {/* Estimated Pricing Summary Card */}
              <div className="rounded-xl border border-border/40 bg-secondary/20 p-3 text-xs">
                <div className="flex justify-between py-0.5 text-muted-foreground text-[10px]">
                  <span>eBay Fees (13.25%)</span>
                  <span>{formattedUSD(fees)}</span>
                </div>
                <div className="flex justify-between py-0.5 text-muted-foreground text-[10px]">
                  <span>Estimated Shipping</span>
                  <span>{formattedUSD(shipping)}</span>
                </div>
                <div className="mt-1.5 flex justify-between items-center border-t border-border/40 pt-1.5">
                  <span className="font-medium text-foreground">eBay Listing Price</span>
                  <span className="font-bold text-foreground">{formattedUSD(sellPrice)}</span>
                </div>
                <div className="mt-1 flex justify-between items-center text-success font-semibold">
                  <span className="text-[10px] tracking-wide uppercase">Estimated Net Profit</span>
                  <span className="text-sm tracking-tight drop-shadow-sm">{formattedUSD(netProfit)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Area: Listing Animator */}
          <div className="mt-5">
            <AnimatePresence mode="wait">
              {isListing && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-3 space-y-1.5"
                >
                  <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
                    <span>Publishing to eBay...</span>
                    <span>{Math.round((listingStep / steps.length) * 100)}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <motion.div 
                      className="h-full bg-primary"
                      initial={{ width: "0%" }}
                      animate={{ width: `${(listingStep / steps.length) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-[9px] text-muted-foreground italic h-4 truncate">
                    {steps[Math.min(listingStep, steps.length - 1)]}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={handleStartListing}
              disabled={isListing}
              className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition-all ${
                isListed
                  ? "bg-success text-white hover:bg-success/90"
                  : "bg-primary text-white hover:bg-primary/95 shadow-glow-primary hover:shadow-soft-lg"
              }`}
            >
              {isListed ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Listed Successfully! (Reset)
                </>
              ) : isListing ? (
                "Publishing..."
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5" />
                  Auto-List to eBay
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Floating Mock eBay Listing Success Card */}
      <AnimatePresence>
        {isListed && (
          <motion.div 
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="mt-4 p-4 rounded-xl border border-success/35 bg-success/5 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-success/20 text-success shrink-0">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-success">Active eBay Listing Created</p>
                <h5 className="text-xs font-semibold text-foreground truncate max-w-xs">
                  {selectedSupplier === "amazon" 
                    ? "Ergonomic Office Chair 3D Lumbar Support Mesh Adjustable Desk" 
                    : "Professional Blender 1000W Countertop High Speed Smoothie"}
                </h5>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] text-muted-foreground">Sell Price</p>
              <p className="text-sm font-bold text-foreground">{formattedUSD(sellPrice)}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
