import { ArrowRight, BarChart3, CheckCircle2, Chrome, Clock3, PackageCheck, ShieldCheck, Sparkles, TrendingUp, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@repo/ui/components/ui/button";
import { useAuth } from "@repo/auth/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { cn } from "@repo/ui/lib/utils";

const metrics = [
  { label: "Active listings", value: "1,284", change: "+18%" },
  { label: "Synced orders", value: "342", change: "live" },
  { label: "Margin tracked", value: "$42.8k", change: "+9%" },
];

const pipeline = [
  { label: "Product captured", icon: Chrome, tone: "text-info bg-info/10" },
  { label: "AI title queued", icon: Sparkles, tone: "text-primary bg-primary/10" },
  { label: "eBay draft ready", icon: PackageCheck, tone: "text-success bg-success/10" },
];

const tableRows = [
  { product: "Compact air purifier", source: "Amazon", channel: "eBay", profit: "$18.40", status: "Ready" },
  { product: "Wireless label printer", source: "Walmart", channel: "eBay", profit: "$31.20", status: "Syncing" },
  { product: "LED desk lamp", source: "Amazon", channel: "eBay", profit: "$12.75", status: "Mapped" },
];

const HeroSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handlePrimary = () => {
    navigate(user ? "/dashboard" : "/signup");
  };

  const handleSecondary = () => {
    const pricing = document.getElementById("pricing");
    pricing?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden border-b border-border bg-background pt-28 sm:pt-32">
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:56px_56px] opacity-[0.24]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent pointer-events-none" />

      <div className="container relative px-4 pb-16 sm:pb-20">
        <div className="grid items-center gap-10 lg:grid-cols-[0.92fr_1.08fr]">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="max-w-2xl"
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground shadow-sm">
              <span className="h-2 w-2 rounded-full bg-success" />
              Marketplace operations platform
            </div>

            <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Run listings, orders, and fulfillment from one control room.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              SellerSuit turns marketplace work into a managed workflow: capture products,
              generate stronger listings, monitor margins, and keep orders moving without
              bouncing between tools.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button onClick={handlePrimary} size="lg" className="h-12 rounded-lg px-6">
                {user ? "Open dashboard" : "Start free"}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button onClick={handleSecondary} variant="outline" size="lg" className="h-12 rounded-lg px-6">
                Compare plans
              </Button>
            </div>

            <div className="mt-7 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm shadow-sm">
                <ShieldCheck className="h-4 w-4 text-success" />
                Secure sync
              </div>
              <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm shadow-sm">
                <Clock3 className="h-4 w-4 text-info" />
                Live updates
              </div>
              <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm shadow-sm">
                <Zap className="h-4 w-4 text-primary" />
                AI assisted
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="relative"
          >
            <div className="rounded-lg border border-border bg-card shadow-soft-xl">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-warning/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-success/80" />
                </div>
                <div className="hidden rounded-md bg-secondary px-3 py-1 text-xs text-muted-foreground sm:block">
                  sellersuit.com/dashboard
                </div>
              </div>

              <div className="grid min-h-[460px] grid-cols-1 lg:grid-cols-[170px_1fr]">
                <aside className="hidden border-r border-border bg-secondary/45 p-3 lg:block">
                  <div className="mb-5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
                    Overview
                  </div>
                  {["Listings", "Orders", "Automation", "Billing"].map((item) => (
                    <div key={item} className="mb-1 rounded-md px-3 py-2 text-sm text-muted-foreground">
                      {item}
                    </div>
                  ))}
                </aside>

                <div className="p-4 sm:p-5">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Operations today
                      </p>
                      <h2 className="text-xl font-semibold text-foreground">Marketplace dashboard</h2>
                    </div>
                    <div className="inline-flex w-fit items-center gap-2 rounded-md border border-success/25 bg-success/10 px-3 py-1.5 text-sm font-medium text-success">
                      <CheckCircle2 className="h-4 w-4" />
                      Healthy
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {metrics.map((metric) => (
                      <div key={metric.label} className="rounded-lg border border-border bg-background p-3">
                        <p className="text-xs text-muted-foreground">{metric.label}</p>
                        <div className="mt-2 flex items-end justify-between">
                          <span className="text-2xl font-semibold text-foreground">{metric.value}</span>
                          <span className="rounded-md bg-success/10 px-2 py-1 text-xs font-medium text-success">
                            {metric.change}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_220px]">
                    <div className="rounded-lg border border-border bg-background p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-foreground">Profit trend</h3>
                          <p className="text-xs text-muted-foreground">Last 30 days</p>
                        </div>
                        <BarChart3 className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex h-36 items-end gap-2">
                        {[38, 52, 44, 66, 58, 72, 63, 81, 74, 92, 85, 98].map((height, index) => (
                          <div
                            key={index}
                            className="flex-1 rounded-t bg-primary/80"
                            style={{ height: `${height}%` }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-background p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-success" />
                        <h3 className="font-semibold text-foreground">Pipeline</h3>
                      </div>
                      <div className="space-y-3">
                        {pipeline.map((step) => {
                          const Icon = step.icon;
                          return (
                            <div key={step.label} className="flex items-center gap-3">
                              <span className={cn("grid h-8 w-8 place-items-center rounded-md", step.tone)}>
                                <Icon className="h-4 w-4" />
                              </span>
                              <span className="text-sm text-foreground">{step.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-lg border border-border bg-background">
                    <div className="grid grid-cols-[1fr_80px_80px_72px] border-b border-border bg-secondary/60 px-3 py-2 text-xs font-medium text-muted-foreground">
                      <span>Listing</span>
                      <span>Source</span>
                      <span>Channel</span>
                      <span>Status</span>
                    </div>
                    {tableRows.map((row) => (
                      <div key={row.product} className="grid grid-cols-[1fr_80px_80px_72px] items-center px-3 py-3 text-sm">
                        <div>
                          <p className="truncate font-medium text-foreground">{row.product}</p>
                          <p className="text-xs text-muted-foreground">{row.profit} expected profit</p>
                        </div>
                        <span className="text-muted-foreground">{row.source}</span>
                        <span className="text-muted-foreground">{row.channel}</span>
                        <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-foreground">
                          {row.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
