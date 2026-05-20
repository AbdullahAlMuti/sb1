import { BarChart3, Bot, FileText, Image, PlugZap, ShoppingCart, type LucideIcon } from "lucide-react";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: PlugZap,
    title: "Extension-connected capture",
    description: "Pull product data, images, titles, and supplier details into SellerSuit with a repeatable browser workflow.",
  },
  {
    icon: Bot,
    title: "AI listing workspace",
    description: "Generate titles and descriptions, keep source metadata, and prepare marketplace-ready drafts from one record.",
  },
  {
    icon: BarChart3,
    title: "Profit visibility",
    description: "Track listing cost, channel price, expected margin, order revenue, and operational changes in the dashboard.",
  },
  {
    icon: ShoppingCart,
    title: "Order operations",
    description: "Sync eBay orders, enrich supplier details, monitor fulfillment status, and export operational reports.",
  },
  {
    icon: Image,
    title: "Image handling",
    description: "Use the extension image tools for extraction, editing, watermarking, and listing asset preparation.",
  },
  {
    icon: FileText,
    title: "Admin controls",
    description: "Manage plans, notices, prompts, users, coupons, and usage from the same SaaS control plane.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="border-b border-border bg-secondary/35 py-20 sm:py-24">
      <div className="container px-4">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Platform</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
              A cleaner operating system for marketplace sellers.
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              The product already has the right building blocks: dashboard modules, Supabase
              functions, plan limits, order sync, and a Chrome extension. The SaaS UI should
              make those systems feel connected and easy to scan.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className="rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/35"
                >
                  <div className="mb-4 grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
