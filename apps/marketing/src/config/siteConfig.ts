import {
  Boxes,
  Calculator,
  LayoutDashboard,
  PanelRightOpen,
  Rocket,
  ScanSearch,
  Sparkles,
  Tags,
  Zap,
} from "lucide-react";
import type { SiteConfig } from "./types";

/**
 * Single source of truth for all marketing copy, CTAs, and pricing.
 * Changing the homepage = editing this file. No marketing strings live in components.
 */
export const siteConfig: SiteConfig = {
  brand: {
    name: "SellerSuit",
    domain: "sellersuit.com",
    tagline: "Source, list, and scale eBay dropshipping from one toolkit.",
    chromeStoreUrl: "https://chromewebstore.google.com/detail/sellersuit",
  },

  nav: {
    links: [
      { label: "How it works", href: "/how-it-works", event: "nav_how_it_works" },
      { label: "Features", href: "/features", event: "nav_features" },
      { label: "Calculator", href: "/calculator", event: "nav_calculator" },
      { label: "Pricing", href: "/pricing", event: "nav_pricing" },
      { label: "Blog", href: "/blog", event: "nav_blog" },
      { label: "FAQ", href: "/faq", event: "nav_faq" },
    ],
    loginCta: { label: "Log in", href: "/auth", event: "nav_login" },
    primaryCta: {
      label: "Add to Chrome — Free",
      href: "https://chromewebstore.google.com/detail/sellersuit",
      event: "cta_add_to_chrome_nav",
      external: true,
    },
  },

  hero: {
    eyebrow: "Amazon · Walmart · AliExpress → eBay",
    titleLead: "List winning products to eBay in",
    titleHighlight: "one click.",
    subtitle:
      "SellerSuit scrapes supplier product data, builds optimized listings with SKUs and pricing, and auto-uploads them to eBay — so you spend minutes per listing, not hours.",
    primaryCta: {
      label: "Add to Chrome — Free",
      href: "https://chromewebstore.google.com/detail/sellersuit",
      event: "cta_add_to_chrome_hero",
      external: true,
    },
    secondaryCta: { label: "See how it works", href: "/how-it-works", event: "cta_how_it_works_hero" },
    stats: [
      { value: "200+", label: "Listings per hour" },
      { value: "3", label: "Supported suppliers" },
      { value: "50k+", label: "Active resellers" },
    ],
  },

  trustBar: {
    heading: "Source from the suppliers you already use",
    proof: "Trusted by 50,000+ resellers",
    logos: [
      { name: "Amazon", src: "/logos/amazon.ico" },
      { name: "Walmart", src: "/logos/walmart.ico" },
      { name: "AliExpress", src: "/logos/aliexpress.ico" },
      { name: "eBay", src: "/logos/ebay.ico" },
    ],
  },

  howItWorks: {
    eyebrow: "How it works",
    heading: "Three steps from supplier page to live eBay listing.",
    subheading: "No spreadsheets, no copy-paste. The extension does the heavy lifting.",
    steps: [
      {
        icon: ScanSearch,
        title: "Scrape",
        description:
          "Open any Amazon, Walmart, or AliExpress product. SellerSuit captures the title, images, variants, and price instantly.",
      },
      {
        icon: Calculator,
        title: "Edit & price",
        description:
          "Auto-generate SKUs, set your margin with the profit engine, and refine titles and descriptions in the side-panel editor.",
      },
      {
        icon: Rocket,
        title: "Auto-upload",
        description:
          "Push the finished listing — or a whole batch — straight to your eBay account. Track everything from the live dashboard.",
      },
    ],
  },

  features: {
    eyebrow: "Everything you need",
    heading: "The complete arbitrage workflow, in one extension.",
    subheading:
      "Built for sellers who care about listings per day, time saved, and margin — not busywork.",
    items: [
      {
        icon: ScanSearch,
        title: "Supplier scraper",
        description:
          "One-click capture of titles, images, variants, and pricing from Amazon, Walmart, and AliExpress product pages.",
      },
      {
        icon: Tags,
        title: "SKU engine",
        description:
          "Generate consistent, trackable SKUs for every product and variant so inventory and orders always map back to the source.",
      },
      {
        icon: Calculator,
        title: "Profit calculator",
        description:
          "Factor in supplier cost, eBay and payment fees, and shipping to set prices that protect your margin before you list.",
      },
      {
        icon: Boxes,
        title: "Bulk upload",
        description:
          "Queue dozens of products and publish them to eBay in the background through the same reliable listing pipeline.",
      },
      {
        icon: LayoutDashboard,
        title: "Live dashboard",
        description:
          "Watch listings, synced orders, and revenue update in real time so you always know what needs action.",
      },
      {
        icon: PanelRightOpen,
        title: "Side-panel editor",
        description:
          "Edit titles, descriptions, images, and variants right beside the supplier page — never lose your place.",
      },
    ],
  },

  calculator: {
    eyebrow: "Know your margin first",
    heading: "Profit calculator",
    subheading: "Adjust the numbers to see your real profit before you list. It's the same math the extension runs on every product.",
    fields: [
      { key: "cost", label: "Supplier cost", prefix: "$", min: 0, max: 500, step: 1, default: 18 },
      { key: "price", label: "eBay sell price", prefix: "$", min: 0, max: 1000, step: 1, default: 39 },
      { key: "feePct", label: "eBay + payment fees", suffix: "%", min: 0, max: 25, step: 0.25, default: 13.25 },
      { key: "shipping", label: "Shipping cost", prefix: "$", min: 0, max: 100, step: 0.5, default: 5 },
    ],
  },

  pricing: {
    eyebrow: "Pricing",
    heading: "Start for $1. Scale when you're ready.",
    subheading: "Every plan includes the scraper, SKU engine, and profit calculator. Upgrade for more listings and automation.",
    note: "Prices in USD. Cancel anytime from the billing portal. No free plan — start with the $1, 7-day trial.",
    tiers: [
      {
        slug: "trial",
        name: "Trial",
        icon: Zap,
        description: "Kick the tires on the full workflow.",
        bestFor: "New sellers testing SellerSuit",
        priceMonthly: 1,
        priceYearly: 1,
        oneTime: true,
        priceNote: "for 7 days",
        seasonalEligible: false,
        features: [
          "10 listings",
          "10 auto-orders",
          "10 AI credits",
          "Bulk lister",
          "Supplier scraper + SKU engine",
        ],
        cta: { label: "Start $1 trial", href: "/register?plan=trial", event: "cta_plan_trial" },
      },
      {
        slug: "starter",
        name: "Starter",
        icon: Rocket,
        description: "For sellers building consistent volume.",
        bestFor: "Solo sellers scaling to a few hundred listings",
        priceMonthly: 15,
        priceYearly: 144,
        seasonalEligible: true,
        features: [
          "200 active listings",
          "50 auto-orders / mo",
          "200 AI credits / mo",
          "Price monitoring",
          "Top-selling product research",
        ],
        cta: { label: "Choose Starter", href: "/register?plan=starter", event: "cta_plan_starter" },
      },
      {
        slug: "pro",
        name: "Pro",
        icon: Sparkles,
        badge: "Most popular",
        description: "For power sellers running it as a business.",
        bestFor: "Full-time resellers and small teams",
        priceMonthly: 49,
        priceYearly: 470.4,
        seasonalEligible: true,
        highlighted: true,
        features: [
          "5,000 active listings",
          "500 auto-orders / mo",
          "1,500 AI credits / mo",
          "All AI research tools",
          "5 eBay accounts + priority support",
        ],
        cta: { label: "Choose Pro", href: "/register?plan=pro", event: "cta_plan_pro" },
      },
    ],
  },

  testimonials: {
    eyebrow: "Loved by resellers",
    heading: "Sellers who switched to a one-click workflow.",
    items: [
      {
        name: "Michael Chen",
        role: "Full-time eBay reseller",
        avatar: "MC",
        quote:
          "I used to spend my whole morning listing. Now I scrape, price, and auto-upload 40 products before my coffee's cold.",
        stat: "40+ listings/day",
      },
      {
        name: "Sarah Williams",
        role: "Amazon → eBay arbitrage",
        avatar: "SW",
        quote:
          "The profit calculator stopped me from listing losers. I finally know my real margin before anything goes live.",
        stat: "+22% avg margin",
      },
      {
        name: "David Rodriguez",
        role: "E-commerce agency",
        avatar: "DR",
        quote:
          "Bulk upload and the live dashboard let us run client stores at a scale that wasn't possible by hand.",
        stat: "8 stores managed",
      },
    ],
  },

  faq: {
    eyebrow: "FAQ",
    heading: "Questions, answered.",
    items: [
      {
        q: "Which suppliers and marketplaces are supported?",
        a: "SellerSuit scrapes from Amazon, Walmart, and AliExpress and auto-uploads to eBay. More marketplaces are on the roadmap.",
      },
      {
        q: "Do I need technical skills to use it?",
        a: "No. Install the Chrome extension, open a product page, and the side-panel walks you through scrape → edit & price → upload.",
      },
      {
        q: "How does the $1 trial work?",
        a: "The 7-day trial is a one-time $1 charge via Stripe and includes 10 listings, 10 auto-orders, and 10 AI credits. Upgrade or cancel anytime.",
      },
      {
        q: "Is dropshipping against eBay's rules?",
        a: "eBay permits sourcing from wholesale suppliers. SellerSuit helps you list compliantly, but you're responsible for following eBay's seller policies.",
      },
      {
        q: "Can I bulk-list products?",
        a: "Yes. Queue products and the bulk lister publishes them to eBay in the background using the same pipeline as single listings.",
      },
      {
        q: "Can I cancel anytime?",
        a: "Absolutely. Manage or cancel your subscription anytime from the Stripe billing portal — no emails, no phone calls.",
      },
    ],
  },

  finalCta: {
    eyebrow: "Ready when you are",
    heading: "Start listing winners today.",
    subheading: "Add the free extension and run your first listing in minutes. Upgrade to a paid plan only when you're ready to scale.",
    primaryCta: {
      label: "Add to Chrome — Free",
      href: "https://chromewebstore.google.com/detail/sellersuit",
      event: "cta_add_to_chrome_final",
      external: true,
    },
    secondaryCta: { label: "Compare plans", href: "#pricing", event: "cta_compare_plans_final" },
  },

  footer: {
    tagline: "The all-in-one toolkit for eBay dropshipping: scrape suppliers, build listings, and scale with confidence.",
    columns: [
      {
        title: "Product",
        links: [
          { label: "How it works", href: "/how-it-works" },
          { label: "Features", href: "/features" },
          { label: "Pricing", href: "/pricing" },
          { label: "Calculator", href: "/calculator" },
        ],
      },
      {
        title: "Resources",
        links: [
          { label: "Blog", href: "/blog" },
          { label: "Documentation", href: "/documentation" },
          { label: "Troubleshooting", href: "/documentation#troubleshooting" },
        ],
      },
      {
        title: "Company",
        links: [
          { label: "About", href: "/about" },
          { label: "Contact", href: "/contact" },
        ],
      },
      {
        title: "Legal",
        links: [
          { label: "Privacy", href: "/privacy-policy" },
          { label: "Terms", href: "/terms-of-service" },
          { label: "Refunds", href: "/refund" },
        ],
      },
    ],
    copyright: "SellerSuit. All rights reserved.",
  },
  problemComparison: {
    eyebrow: "The Arbitrage Reality Check",
    heading: "Manual Listing is costing you hours and missed profit.",
    subheading: "Compare how dropshippers manage listings manually versus with SellerSuit automated flows.",
    manual: {
      title: "Manual Dropshipping",
      description: "Prone to typos, slow updates, and thin margins.",
      items: [
        "Find a hot product on Amazon or Walmart",
        "Save 10+ images to desktop, rename, and upload to eBay",
        "Manually copy-paste title, description, and spec tables",
        "Guess margins by calculating eBay's 13.25% + payment fees manually",
        "Create arbitrary custom SKU names that get lost in orders",
        "Total: 15–20 minutes per listing with high risk of mistakes"
      ]
    },
    automated: {
      title: "SellerSuit Automation",
      description: "Error-free, optimized listings synced in seconds.",
      items: [
        "One-click Chrome extension scrapes full page data instantly",
        "Auto-pulls and sizes high-res images in correct aspect ratios",
        "AI translates details into conversion-optimized eBay specs",
        "Profit engine calculates fees, shipping, and margin in real time",
        "Consistent SKU generator auto-maps source product ID for tracking",
        "Total: Under 30 seconds per listing, completely automated"
      ]
    }
  },
  visualPipeline: {
    eyebrow: "Automated Data Pipeline",
    heading: "Supplier-to-eBay Synchronization",
    subheading: "See how SellerSuit extracts raw supplier pages and transforms them into active eBay assets."
  }
};

export default siteConfig;
