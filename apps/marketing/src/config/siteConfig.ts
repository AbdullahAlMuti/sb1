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

export const BRAND_LOGOS = {
  amazon: { name: "Amazon", src: "/logos/amazon-icon.svg" },
  walmart: { name: "Walmart", src: "/logos/walmart.svg" },
  ebay: { name: "eBay", src: "/logos/ebay.svg" },
  aliexpress: { name: "AliExpress", src: "/logos/aliexpress.svg" },
  alibaba: { name: "Alibaba", src: "/logos/alibaba.svg" },
  temu: { name: "Temu", src: "/logos/temu.svg" },
  banggood: { name: "Banggood", src: "https://images.weserv.nl/?url=logo.clearbit.com/banggood.com" },
  cjDropshipping: { name: "CJ Dropshipping", src: "/logos/cjdropshipping.ico" },
  facebook: { name: "Facebook", src: "/logos/facebook.svg" },
  shopify: { name: "Shopify", src: "/logos/shopify.svg" },
  mercury: { name: "Mercury", src: "https://images.weserv.nl/?url=logo.clearbit.com/mercury.com" },
  mercari: { name: "Mercari", src: "/logos/Mercari.jpeg" },
  tiktok: { name: "TikTok", src: "/logos/tiktok.svg" },
  etsy: { name: "Etsy", src: "/logos/etsy.svg" },
};

export const ACTIVE_SCROLLING_LOGOS = [
  BRAND_LOGOS.amazon,
  BRAND_LOGOS.walmart,
  BRAND_LOGOS.ebay,
  BRAND_LOGOS.aliexpress,
  BRAND_LOGOS.alibaba,
  BRAND_LOGOS.temu,
  BRAND_LOGOS.cjDropshipping,
  BRAND_LOGOS.mercari,
  BRAND_LOGOS.tiktok,
  BRAND_LOGOS.etsy,
];

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
      { label: "Our Services", href: "/services", event: "nav_services" },
      { label: "Automation Services", href: "/automation-services", event: "nav_automation_services" },
      { label: "How it works", href: "/how-it-works", event: "nav_how_it_works" },
      { label: "Features", href: "/features", event: "nav_features" },
      { label: "Pricing", href: "/pricing", event: "nav_pricing" },
    ],
    loginCta: { label: "Log in", href: "/auth", event: "nav_login" },
    primaryCta: {
      label: "Start $1 Trial",
      href: "/signup",
      event: "cta_start_trial_nav",
      external: false,
    },
  },

  products: [
    {
      id: "merchmint",
      name: "MerchMint",
      tagline: "Merch by Amazon research & listing automation",
      href: "https://merchmint.sellersuit.com/",
      status: "live",
      statusLabel: "Live",
      iconName: "ShoppingBag",
      isExternal: true,
      color: "#10b981",
    },
    {
      id: "feedsort",
      name: "FeedSort",
      tagline: "E-commerce data feed optimizer & product sorter",
      href: "https://feedsort.sellersuit.com/",
      status: "live",
      statusLabel: "Live",
      iconName: "Layers",
      isExternal: true,
      color: "#8b5cf6",
    },
    {
      id: "ai-cv",
      name: "AI CV Manager",
      tagline: "AI-powered resume optimizer & applicant tracking",
      href: "#",
      status: "coming_soon",
      statusLabel: "Coming Soon",
      iconName: "Sparkles",
      isExternal: false,
      color: "#f59e0b",
    },
  ],

  services: [
    {
      id: "branding",
      title: "BRANDING",
      tagline: "Visual identity, design systems & brand positioning",
      description: "We forge distinctive brand identities that command authority. From logo marks and cohesive design languages to packaging and digital guidelines, we make your company unforgettable.",
      deliverables: ["Visual Identity System", "Typography & Color Matrix", "Design Systems & Token Libraries", "Brand Collateral & Packaging"],
      accentColor: "#ea580c",
      bgGradient: "from-orange-500/20 via-amber-500/10 to-transparent",
      previewImage: "/images/services/branding.jpg",
      iconName: "Palette",
      category: "Design & Identity",
    },
    {
      id: "uiux",
      title: "UI/UX",
      tagline: "Human-centered digital interfaces & tactile interactions",
      description: "Creating intuitive, aesthetic, and friction-free digital experiences. We turn complex business workflows into elegant, joyful interfaces that maximize conversion and user retention.",
      deliverables: ["User Journey Mapping", "Wireframing & Interactive Prototypes", "Figma Design Systems", "Micro-interactions & Motion"],
      accentColor: "#0284c7",
      bgGradient: "from-sky-500/20 via-blue-500/10 to-transparent",
      previewImage: "/images/services/uiux.jpg",
      iconName: "Layout",
      category: "Design & Identity",
    },
    {
      id: "ml-ai",
      title: "ML & AI DEVELOPMENT",
      tagline: "Autonomous agent pipelines & intelligent model integration",
      description: "Leverage state-of-the-art LLMs, neural networks, and custom machine learning pipelines to automate mission-critical processes, predictive intelligence, and conversational agents.",
      deliverables: ["Custom LLM Fine-Tuning & RAG", "Autonomous Multi-Agent Systems", "Predictive Analytics Models", "Computer Vision & OCR Pipelines"],
      accentColor: "#8b5cf6",
      bgGradient: "from-purple-500/20 via-violet-500/10 to-transparent",
      previewImage: "/images/services/ml-ai.jpg",
      iconName: "Cpu",
      category: "Intelligence & Data",
    },
    {
      id: "payment-solution",
      title: "PAYMENT SOLUTION",
      tagline: "Global payment gateways, recurring billing & compliance",
      description: "Engineered for high-volume transactions with bulletproof security. Stripe, PayPal, multi-currency wallets, merchant accounts, and fraud prevention architectures.",
      deliverables: ["Stripe & Global Gateway Integrations", "Subscription & Usage-Based Billing", "PCI-DSS Compliance Hardening", "Multi-Currency & Automated Payouts"],
      accentColor: "#10b981",
      bgGradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
      previewImage: "/images/services/payment-solution.jpg",
      iconName: "CreditCard",
      category: "Commerce & Fintech",
    },
    {
      id: "ecommerce-dev",
      title: "ECOMMERCE DEVELOPMENT",
      tagline: "High-conversion headless storefronts & marketplace infrastructure",
      description: "End-to-end commerce development optimized for lightning speed, mobile conversions, inventory synchronization, and omnichannel scale.",
      deliverables: ["Headless Commerce Architecture", "Marketplace Integrations & Sync", "Custom Checkout Optimization", "Catalog Management & ERP Bridge"],
      accentColor: "#f59e0b",
      bgGradient: "from-amber-500/20 via-orange-500/10 to-transparent",
      previewImage: "/images/services/ecommerce-dev.jpg",
      iconName: "ShoppingBag",
      category: "Commerce & Fintech",
    },
    {
      id: "business-intelligence",
      title: "BUSINESS INTELLIGENCE",
      tagline: "Actionable revenue analytics, reporting & data warehousing",
      description: "Transform raw transactional data into strategic clarity. Real-time dashboards, profit tracking, cohort analyses, and automated executive intelligence.",
      deliverables: ["Executive KPI Dashboards", "BigQuery / Snowflake Warehousing", "Automated ETL Data Pipelines", "Predictive Revenue & Churn Models"],
      accentColor: "#3b82f6",
      bgGradient: "from-blue-500/20 via-indigo-500/10 to-transparent",
      previewImage: "/images/services/business-intelligence.jpg",
      iconName: "BarChart3",
      category: "Intelligence & Data",
    },
    {
      id: "shopify-services",
      title: "SHOPIFY SERVICES",
      tagline: "Custom Liquid themes, bespoke apps & store optimization",
      description: "Elite Shopify Plus development, bespoke app creation, custom checkout extensions, theme speed optimization, and migration workflows.",
      deliverables: ["Custom Theme & Liquid Engineering", "Bespoke Public/Custom Shopify Apps", "Shopify Plus Checkout Extensions", "Core Web Vitals Speed Optimization"],
      accentColor: "#059669",
      bgGradient: "from-emerald-600/20 via-green-500/10 to-transparent",
      previewImage: "/images/services/shopify-services.jpg",
      iconName: "Store",
      category: "Commerce & Fintech",
    },
    {
      id: "qa-testing",
      title: "QA TESTING AND AUTOMATION",
      tagline: "End-to-end test suites, load testing & continuous reliability",
      description: "Automated regression testing, Playwright E2E suites, API stress testing, and security scanning to ensure zero bugs ship to your production users.",
      deliverables: ["Playwright & Cypress E2E Automation", "API & Integration Test Frameworks", "High-Concurrency Load Testing", "CI/CD Automated Quality Gates"],
      accentColor: "#dc2626",
      bgGradient: "from-red-500/20 via-rose-500/10 to-transparent",
      previewImage: "/images/services/qa-testing.jpg",
      iconName: "CheckCircle2",
      category: "Engineering & Cloud",
    },
    {
      id: "mobile-app-dev",
      title: "MOBILE APP DEVELOPMENT",
      tagline: "Native iOS & Android apps with seamless offline performance",
      description: "Crafting fluid, responsive mobile experiences built with React Native and native iOS/Android SDKs, published smoothly to Google Play and Apple App Store.",
      deliverables: ["React Native & Flutter Apps", "Native iOS & Android Engineering", "Push Notifications & Offline Sync", "App Store & Play Store Publishing"],
      accentColor: "#ec4899",
      bgGradient: "from-pink-500/20 via-rose-500/10 to-transparent",
      previewImage: "/images/services/mobile-app-dev.jpg",
      iconName: "Smartphone",
      category: "Engineering & Cloud",
    },
    {
      id: "erp-management",
      title: "ERP MANAGEMENT SYSTEM",
      tagline: "Integrated resource planning, supply chain & operations",
      description: "Unify inventory, suppliers, accounting, human resources, and multi-channel fulfillment into a cohesive, synchronized real-time management hub.",
      deliverables: ["Centralized Operations Dashboard", "Automated Inventory Tracking", "Supplier & Purchase Order Sync", "Custom Financial & Ledger Reports"],
      accentColor: "#6366f1",
      bgGradient: "from-indigo-500/20 via-purple-500/10 to-transparent",
      previewImage: "/images/services/erp-management.jpg",
      iconName: "Boxes",
      category: "Enterprise & Operations",
    },
    {
      id: "cloud-solution",
      title: "CLOUD SOLUTION",
      tagline: "Scalable serverless infrastructure, DevOps & zero-downtime clusters",
      description: "Architecting resilient cloud ecosystems across AWS, GCP, Cloudflare, and Kubernetes. Automated CI/CD, auto-scaling, and enterprise security.",
      deliverables: ["AWS / GCP / Cloudflare DevOps", "Docker & Kubernetes Containerization", "Multi-Region Auto-Scaling & CDN", "Zero-Downtime CI/CD Pipelines"],
      accentColor: "#06b6d4",
      bgGradient: "from-cyan-500/20 via-teal-500/10 to-transparent",
      previewImage: "/images/services/cloud-solution.jpg",
      iconName: "Cloud",
      category: "Engineering & Cloud",
    },
  ],

  automationServices: {
    eyebrow: "Automate Everything",
    heading: "AI where your team works.",
    subheading:
      "Eliminate repetitive manual tasks with custom enterprise automation pipelines, autonomous agent decision engines, and resilient data extractors engineered to scale.",
    items: [
      {
        id: "n8n-workflows",
        badge: "Workflow Orchestration",
        title: "N8n Multi-Step Workflow Engine",
        tagline: "Complex logic and multi-app orchestration without fragile code",
        description:
          "Connect CRMs, inventory systems, databases, and communication channels into reliable, automated event chains. Self-healing node execution with automated retries, error routing, and dead-letter queues.",
        videoSrc: "/videos/n8n.mp4",
        posterSrc: "/videos/n8n-poster.jpg",
        capabilities: [
          "Visual multi-branch flow builder with 500+ pre-built connectors",
          "Deterministic webhooks and scheduled cron triggers",
          "Error handling, retry backoffs, and execution audit logs",
          "Self-hosted privacy or cloud-native high-throughput deployment",
        ],
        accentColor: "#ea580c",
        ctaText: "Request Custom Automation →",
      },
      {
        id: "hermes-agent",
        badge: "Autonomous Decisioning",
        title: "Hermes Self-Learning Decision Agent",
        tagline: "Context-aware AI reasoning for non-deterministic operations",
        description:
          "Deploy autonomous reasoning agents capable of evaluating context, reconciling disparate records, drafting customer communications, and executing authorized decisions within human-defined guardrails.",
        videoSrc:
          "https://videos.ctfassets.net/spoqsaf9291f/1OLb7tmvBV87BCaVvTUhsO/bf8b7aa035add8cb4482c840342aa2f6/web-create-your-own-4x3_final.mp4",
        posterSrc:
          "https://images.ctfassets.net/spoqsaf9291f/15uVF5m1kQriPMlHagIwWY/8aa8519f91779b95d414502d04e29f5f/web-create-your-own-4x3_final.jpg",
        capabilities: [
          "Dynamic prompt synthesis and vector memory recall",
          "Human-in-the-loop review triggers and compliance bounds",
          "Automated ticket resolution and customer triage",
          "Multi-modal input parsing for invoices, emails, and attachments",
        ],
        accentColor: "#3b82f6",
        ctaText: "Request Custom Automation →",
      },
      {
        id: "openclaw-scraper",
        badge: "Resilient Web Scraping",
        title: "OpenClaw Resilient Web Scraper",
        tagline: "Fault-tolerant data harvesting that circumvents anti-bot shields",
        description:
          "Extract structured catalog, pricing, and availability data from complex supplier portals and JavaScript SPAs. Features rotating proxies, headless browser clusters, and adaptive DOM selectors.",
        videoSrc:
          "https://videos.ctfassets.net/spoqsaf9291f/NbFul3fpx8iFqd92FdjZb/2a0b3f2e96fdcd6623bf0f97064bfc1c/web-qa-agent-4x3_final.mp4",
        posterSrc:
          "https://images.ctfassets.net/spoqsaf9291f/5Isk6wP7mwgbI1uuPOXCDT/9971afbbf0f81172ac8c0af85bb1877c/web-qa-agent-4x3_final.jpg",
        capabilities: [
          "Anti-bot bypass with fingerprint randomization and residential IP rotation",
          "Dynamic JavaScript rendering via stealth browser clusters",
          "Schema-conforming JSON transformation and validation pipelines",
          "Real-time change detection and delta webhooks",
        ],
        accentColor: "#10b981",
        ctaText: "Request Custom Automation →",
      },
      {
        id: "multi-agent-swarms",
        badge: "Swarm Intelligence",
        title: "Coordinated Multi-Agent Swarms",
        tagline: "Collaborative agent networks decomposing multi-disciplinary projects",
        description:
          "Harness specialized agents (analyst, copywriter, auditor, executor) operating in continuous consensus. Solves complex tasks that exceed single LLM capabilities through peer validation and handoffs.",
        videoSrc:
          "https://videos.ctfassets.net/spoqsaf9291f/1OLb7tmvBV87BCaVvTUhsO/bf8b7aa035add8cb4482c840342aa2f6/web-create-your-own-4x3_final.mp4",
        posterSrc:
          "https://images.ctfassets.net/spoqsaf9291f/15uVF5m1kQriPMlHagIwWY/8aa8519f91779b95d414502d04e29f5f/web-create-your-own-4x3_final.jpg",
        capabilities: [
          "Hierarchical agent orchestration with supervisor routing",
          "Stateful shared memory bus and tool execution sandboxes",
          "Peer-review cycles to eliminate hallucinations and drift",
          "Parallel sub-task execution with deterministic synthesis",
        ],
        accentColor: "#8b5cf6",
        ctaText: "Request Custom Automation →",
      },
      {
        id: "erp-webhook-bridge",
        badge: "Enterprise Integration",
        title: "Real-Time Event Broker & ERP Bridge",
        tagline: "Zero-latency synchronization between legacy ERPs and modern platforms",
        description:
          "Bridge NetSuite, SAP, Shopify, and custom database backends with bidirectional event streaming. Guarantees FIFO delivery, payload encryption, deduplication, and schema validation.",
        videoSrc:
          "https://videos.ctfassets.net/spoqsaf9291f/NbFul3fpx8iFqd92FdjZb/2a0b3f2e96fdcd6623bf0f97064bfc1c/web-qa-agent-4x3_final.mp4",
        posterSrc:
          "https://images.ctfassets.net/spoqsaf9291f/5Isk6wP7mwgbI1uuPOXCDT/9971afbbf0f81172ac8c0af85bb1877c/web-qa-agent-4x3_final.jpg",
        capabilities: [
          "Sub-100ms bidirectional event propagation and webhook queuing",
          "Automatic schema mapping and idempotency key deduplication",
          "Legacy ERP connectors (NetSuite, SAP, Microsoft Dynamics)",
          "End-to-end payload encryption and SOC2-compliant logging",
        ],
        accentColor: "#06b6d4",
        ctaText: "Request Custom Automation →",
      },
    ],
  },

  hero: {
    eyebrow: "Amazon · Walmart → eBay",
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
      { value: "2", label: "Supported suppliers" },
      { value: "50k+", label: "Active resellers" },
    ],
  },

  trustBar: {
    heading: "Source from the suppliers you already use",
    proof: "Trusted by 50,000+ resellers",
    logos: [
      BRAND_LOGOS.amazon,
      BRAND_LOGOS.walmart,
      BRAND_LOGOS.ebay,
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
          "Open any supported Amazon or Walmart product. SellerSuit captures the title, images, variants, and price instantly.",
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
          "One-click capture of titles, images, variants, and pricing from supported Amazon and Walmart product pages.",
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
        cta: { label: "Start $1 trial", href: "/signup?plan=trial", event: "cta_plan_trial" },
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
          "500 active listings",
          "250 auto-orders / mo",
          "500 AI credits / mo",
          "Price monitoring",
          "Bulk lister",
        ],
        cta: { label: "Choose Starter", href: "/signup?plan=starter", event: "cta_plan_starter" },
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
          "Unlimited auto-orders",
          "5,000 AI credits / mo",
          "All AI research tools",
          "2 eBay accounts + priority support",
        ],
        cta: { label: "Choose Pro", href: "/signup?plan=pro", event: "cta_plan_pro" },
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
        a: "SellerSuit scrapes from Amazon and Walmart and auto-uploads to eBay. More supplier sources may be added later.",
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
    email: "contact@sellersuit.com",
    offices: [
      {
        country: "Bangladesh",
        label: "Bangladesh Office",
        address: "195, Fakirapool (2nd Floor), Motijheel, Dhaka-1000",
        flag: "🇧🇩",
      },
      {
        country: "USA",
        label: "USA Office",
        address: "491 Fort Smith Blvd, Deltona, FL 32738, United States",
        flag: "🇺🇸",
      },
    ],
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
          { label: "eBay Fees Calculator", href: "/resources/ebay-fees-calculator" },
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
          { label: "Limited Use", href: "/limited-use" },
          { label: "Permissions", href: "/permissions" },
          { label: "Data Deletion", href: "/data-deletion" },
          { label: "Cookie Policy", href: "/cookie-policy" },
          { label: "Security", href: "/security" },
          { label: "Third-Party Disclaimer", href: "/third-party-disclaimer" },
          { label: "AI Policy", href: "/ai-policy" },
          { label: "No Ads / Affiliate", href: "/affiliate-ads-disclosure" },
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
