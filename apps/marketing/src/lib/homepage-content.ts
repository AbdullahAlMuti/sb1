/**
 * Homepage content client.
 *
 * Fetches structured content from the `homepage-content` Edge Function.
 * Falls back to compile-time defaults (derived from siteConfig / themeConfig) so
 * the page never blanks on a network failure or empty DB.
 *
 * Callers receive a `HomepageContent` object regardless of whether the fetch
 * succeeds — all sections are always populated.
 */
import type { HomepageContent } from "@repo/types";
import { siteConfig } from "@/config/siteConfig";
import { themeConfig } from "@/config/themeConfig";

const EDGE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "") +
  "/functions/v1/homepage-content";

// ── Fallback defaults ─────────────────────────────────────────────────────────
// Derived from siteConfig.ts so they exactly match the current compile-time copy.
// If the DB is empty or unreachable the homepage renders identically to before.

const FALLBACK: HomepageContent = {
  announcement: {
    message: themeConfig.seasonalCampaign.bannerText,
    link: {
      label: themeConfig.seasonalCampaign.cta.label,
      href: themeConfig.seasonalCampaign.cta.href,
    },
    accentColors: themeConfig.seasonalCampaign.accentColors,
  },

  nav: {
    links: siteConfig.nav.links.map((l) => ({ label: l.label, href: l.href })),
    megaDrops: [
      {
        label: "Product",
        groups: [
          {
            heading: "Core workflow",
            items: [
              { icon: "ScanSearch",      title: "Supplier Scraper",   subtitle: "One-click capture from AliExpress and supported supplier platforms", href: "/features#scraper" },
              { icon: "Tags",            title: "SKU Engine",         subtitle: "Auto-generate trackable SKUs for every variant",      href: "/features#sku" },
              { icon: "Calculator",      title: "Profit Calculator",  subtitle: "Set prices that protect your margin before you list", href: "/calculator" },
              { icon: "Boxes",           title: "Bulk Upload",        subtitle: "Queue dozens of products and publish in the background", href: "/features#bulk" },
            ],
          },
          {
            heading: "Dashboard & insights",
            items: [
              { icon: "LayoutDashboard", title: "Live Dashboard",     subtitle: "Listings, orders, and revenue update in real time",   href: "/features#dashboard" },
              { icon: "PanelRightOpen",  title: "Side-Panel Editor",  subtitle: "Edit titles, images, and variants beside the product page", href: "/features#editor" },
            ],
          },
        ],
      },
      {
        label: "Resources",
        groups: [
          {
            items: [
              { icon: "BookOpen",    title: "Documentation", subtitle: "Setup guides, API reference, and troubleshooting", href: "/documentation" },
              { icon: "Newspaper",   title: "Blog",          subtitle: "Tips, strategies, and eBay dropshipping news",     href: "/blog" },
              { icon: "HelpCircle",  title: "FAQ",           subtitle: "Answers to the most common seller questions",      href: "/faq" },
            ],
          },
        ],
      },
    ],
    loginCta:   { label: siteConfig.nav.loginCta.label,   href: siteConfig.nav.loginCta.href },
    primaryCta: { label: siteConfig.nav.primaryCta.label, href: siteConfig.nav.primaryCta.href, external: siteConfig.nav.primaryCta.external },
  },

  hero: {
    eyebrow:        siteConfig.hero.eyebrow,
    titleLead:      siteConfig.hero.titleLead,
    titleHighlight: siteConfig.hero.titleHighlight,
    subtitle:       siteConfig.hero.subtitle,
    primaryCta:   { label: siteConfig.hero.primaryCta.label,   href: siteConfig.hero.primaryCta.href,   external: siteConfig.hero.primaryCta.external,   event: siteConfig.hero.primaryCta.event },
    secondaryCta: { label: siteConfig.hero.secondaryCta.label, href: siteConfig.hero.secondaryCta.href, external: siteConfig.hero.secondaryCta.external, event: siteConfig.hero.secondaryCta.event },
    heroImageSrc: "",
    heroImageAlt: "SellerSuit dashboard showing live eBay listings",
    stats: siteConfig.hero.stats,
  },

  logo_cloud: {
    heading: siteConfig.trustBar.heading,
    proof:   siteConfig.trustBar.proof,
    logos:   siteConfig.trustBar.logos,
  },

  use_cases: {
    eyebrow: "Built for every workflow",
    heading: "From solo seller to full-scale operation.",
    intro:   "SellerSuit adapts to how you work — whether you're listing 10 products a day or 10,000.",
    cards: [
      { icon: "Zap",        heading: "Single-item listing",    description: "Open any supplier page, scrape in one click, edit in the side panel, and push to eBay in under 30 seconds." },
      { icon: "Boxes",      heading: "Bulk listing campaigns", description: "Queue an entire category of products, set a margin rule, and let the bulk lister publish them while you sleep." },
      { icon: "TrendingUp", heading: "Price monitoring",       description: "Track supplier price changes and automatically reprice your eBay listings to protect your margin." },
      { icon: "Sparkles",   heading: "AI-powered descriptions",description: "Generate eBay-optimized, policy-compliant listing descriptions from raw supplier data using built-in AI." },
    ],
  },

  benefits: {
    eyebrow: "Why SellerSuit",
    heading: "Everything a reseller needs, nothing they don't.",
    intro:   "Designed to eliminate the copy-paste grind and give you back time to focus on sourcing winners.",
    items: [
      { icon: "Clock",       label: "30-second listings",    description: "From supplier page to live eBay listing in under a minute." },
      { icon: "ShieldCheck", label: "eBay policy-safe",      description: "AI strips supplier names, URLs, and banned phrases automatically." },
      { icon: "DollarSign",  label: "Real margin visibility",description: "Factor in all fees and shipping before a single listing goes live." },
      { icon: "BarChart2",   label: "Live order tracking",   description: "Synced orders and revenue update in real time on your dashboard." },
    ],
  },

  features: {
    eyebrow: siteConfig.howItWorks.eyebrow,
    heading: siteConfig.howItWorks.heading,
    intro:   siteConfig.howItWorks.subheading,
    blocks: [
      {
        number: 1,
        heading:     "Scrape the supplier page",
        description: "Open any supported supplier product page. SellerSuit captures the title, images, all variants, and the current price — instantly, in one click.",
        bullets: [
          { icon: "Image",     label: "High-res images captured automatically" },
          { icon: "Tags",      label: "All variants and options extracted" },
          { icon: "Zap",       label: "Under 3 seconds per product" },
        ],
        imageSrc: "", imageAlt: "SellerSuit side panel showing scraped product data",
      },
      {
        number: 2,
        heading:     "Edit, price, and optimize",
        description: "Auto-generate SKUs, set your margin with the profit engine, and refine the AI-written title and description — all in the side-panel editor, right beside the product page.",
        bullets: [
          { icon: "Calculator", label: "Profit engine calculates fees and shipping" },
          { icon: "Sparkles",   label: "AI writes eBay-optimized descriptions" },
          { icon: "Edit3",      label: "Edit titles, images, and variants inline" },
        ],
        imageSrc: "", imageAlt: "Profit calculator and side-panel editor",
      },
      {
        number: 3,
        heading:     "Auto-upload to eBay",
        description: "Push the finished listing — or a whole batch — straight to your eBay account. Track everything from the live dashboard without ever touching eBay's seller hub.",
        bullets: [
          { icon: "Rocket",          label: "Single listing or bulk queue" },
          { icon: "LayoutDashboard", label: "Live dashboard syncs orders in real time" },
          { icon: "RefreshCw",       label: "Auto-reprice when supplier costs change" },
        ],
        imageSrc: "", imageAlt: "SellerSuit dashboard with live eBay listings",
      },
    ],
  },

  trust: {
    eyebrow:   "Built for trust",
    heading:   "Compliant, secure, and built on proven infrastructure.",
    paragraph: "SellerSuit is built on Supabase for data security and Stripe for payments. All listing pipelines are designed to stay within eBay seller policy.",
    paragraphLink: { label: "documentation", href: "/documentation" },
    badges: [
      { label: "eBay Policy Compliant",   description: "Listings generated within eBay's seller guidelines" },
      { label: "Stripe Payments",         description: "Billing handled securely by Stripe" },
      { label: "Supabase Infrastructure", description: "Data stored on Supabase Postgres with RLS" },
      { label: "SSL Encrypted",           description: "All traffic encrypted end-to-end" },
    ],
  },

  mission: {
    eyebrow:   "Our mission",
    heading:   "Make eBay arbitrage accessible to every seller.",
    paragraph: "We built SellerSuit because we saw talented resellers spending 80% of their time on busywork — copy-paste titles, manual image uploads, guessing margins. The extension handles the grind so you can focus on what matters: finding winning products and scaling your store.",
    cta: { label: "Read our story", href: "/about", external: false },
  },

  community: {
    eyebrow: "Join the community",
    heading: "Built with resellers, for resellers.",
    intro:   "Connect with thousands of eBay sellers, share strategies, and get help when you need it.",
    channels: [
      { icon: "MessageCircle", name: "Discord",       blurb: "Live chat, strategy discussions, and direct access to the SellerSuit team.",              actionLabel: "Join Discord",  href: "https://discord.gg/sellersuit" },
      { icon: "Newspaper",     name: "Blog",          blurb: "In-depth guides on sourcing strategies, eBay SEO, and scaling your store.",                actionLabel: "Read the blog", href: "/blog" },
      { icon: "BookOpen",      name: "Documentation", blurb: "Step-by-step setup guides, API reference, and troubleshooting for every feature.",         actionLabel: "Browse docs",   href: "/documentation" },
      { icon: "Mail",          name: "Support",       blurb: "Got a question or found a bug? Our team responds within 24 hours.",                        actionLabel: "Contact us",    href: "/contact" },
    ],
  },

  final_cta: {
    heading:      siteConfig.finalCta.heading,
    subheading:   siteConfig.finalCta.subheading,
    primaryCta:   { label: siteConfig.finalCta.primaryCta.label,   href: siteConfig.finalCta.primaryCta.href,   external: siteConfig.finalCta.primaryCta.external,   event: siteConfig.finalCta.primaryCta.event },
    secondaryCta: { label: siteConfig.finalCta.secondaryCta.label, href: siteConfig.finalCta.secondaryCta.href, external: siteConfig.finalCta.secondaryCta.external, event: siteConfig.finalCta.secondaryCta.event },
  },

  footer: {
    tagline: siteConfig.footer.tagline,
    columns: siteConfig.footer.columns,
    badges: [
      { label: "eBay Policy Compliant" },
      { label: "Stripe Secured" },
      { label: "SSL Encrypted" },
    ],
    social: [
      { icon: "Twitter",  name: "Twitter",  href: "https://twitter.com/sellersuit" },
      { icon: "Youtube",  name: "YouTube",  href: "https://youtube.com/@sellersuit" },
      { icon: "Linkedin", name: "LinkedIn", href: "https://linkedin.com/company/sellersuit" },
    ],
    copyright: siteConfig.footer.copyright,
  },
};

// ── Fetch hook ────────────────────────────────────────────────────────────────

let _cache: HomepageContent | null = null;
let _cacheTs = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min client-side cache

/**
 * Fetch homepage content from the Edge Function.
 * Returns the fallback if the fetch fails or the DB is empty.
 * Results are cached for 5 minutes to avoid re-fetching on re-renders.
 */
export async function fetchHomepageContent(): Promise<HomepageContent> {
  const now = Date.now();
  if (_cache && now - _cacheTs < CACHE_TTL_MS) return _cache;

  try {
    const res = await fetch(EDGE_URL, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    if (json?.content) {
      // Deep-merge with fallback so any missing keys in the DB content
      // still resolve to the compile-time default.
      _cache = deepMerge(FALLBACK, json.content) as HomepageContent;
      _cacheTs = now;
      return _cache;
    }
  } catch (err) {
    console.warn("[homepage-content] fetch failed, using fallback:", err);
  }

  return FALLBACK;
}

/** Returns the hardcoded fallback synchronously for SSR/pre-render contexts. */
export function getFallbackContent(): HomepageContent {
  return FALLBACK;
}

// ── Deep merge utility ────────────────────────────────────────────────────────

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function deepMerge(base: unknown, override: unknown): unknown {
  if (!isObject(base) || !isObject(override)) return override ?? base;
  const result: Record<string, unknown> = { ...base };
  for (const key of Object.keys(override)) {
    result[key] = deepMerge(base[key], override[key]);
  }
  return result;
}
