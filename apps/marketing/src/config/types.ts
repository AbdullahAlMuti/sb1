import type { LucideIcon } from "lucide-react";

/**
 * Typed shapes for the config-driven marketing homepage.
 * Every piece of marketing copy, CTA, and price lives in `siteConfig.ts`;
 * every theme/campaign value lives in `themeConfig.ts`. Components read these
 * and never hardcode marketing strings.
 */

export interface CTA {
  label: string;
  /** Hash (#pricing) → smooth scroll · external → new tab · else → SPA navigate. */
  href: string;
  /** Analytics event name fired on click. */
  event: string;
  external?: boolean;
}

export interface NavLink {
  label: string;
  href: string;
  event: string;
}

export interface BrandConfig {
  name: string;
  domain: string;
  tagline: string;
  /** Chrome Web Store listing URL for the "Add to Chrome" CTA. */
  chromeStoreUrl: string;
}

export interface HeroStat {
  value: string;
  label: string;
}

export interface HeroConfig {
  eyebrow: string;
  titleLead: string;
  titleHighlight: string;
  subtitle: string;
  primaryCta: CTA;
  secondaryCta: CTA;
  stats: HeroStat[];
}

export interface MarketplaceLogo {
  name: string;
  src: string;
}

export interface TrustBarConfig {
  heading: string;
  proof: string;
  logos: MarketplaceLogo[];
}

export interface StepItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface HowItWorksConfig {
  eyebrow: string;
  heading: string;
  subheading: string;
  steps: StepItem[];
}

export interface FeatureItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface FeatureGridConfig {
  eyebrow: string;
  heading: string;
  subheading: string;
  items: FeatureItem[];
}

export type CalculatorFieldKey = "cost" | "price" | "feePct" | "shipping";

export interface CalculatorField {
  key: CalculatorFieldKey;
  label: string;
  prefix?: string;
  suffix?: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

export interface CalculatorConfig {
  eyebrow: string;
  heading: string;
  subheading: string;
  fields: CalculatorField[];
}

export type BillingInterval = "monthly" | "yearly";

export interface PricingTier {
  slug: string;
  name: string;
  icon: LucideIcon;
  badge?: string;
  description: string;
  bestFor: string;
  priceMonthly: number;
  priceYearly: number;
  /** One-time tiers (e.g. the $1 trial) ignore the monthly/yearly toggle. */
  oneTime?: boolean;
  priceNote?: string;
  /** Whether the seasonal campaign discount applies to this tier. */
  seasonalEligible: boolean;
  features: string[];
  cta: CTA;
  highlighted?: boolean;
}

export interface PricingConfig {
  eyebrow: string;
  heading: string;
  subheading: string;
  note: string;
  tiers: PricingTier[];
}

export interface Testimonial {
  name: string;
  role: string;
  avatar: string;
  quote: string;
  stat?: string;
}

export interface TestimonialsConfig {
  eyebrow: string;
  heading: string;
  items: Testimonial[];
}

export interface FAQItem {
  q: string;
  a: string;
}

export interface FAQConfig {
  eyebrow: string;
  heading: string;
  items: FAQItem[];
}

export interface FinalCtaConfig {
  eyebrow: string;
  heading: string;
  subheading: string;
  primaryCta: CTA;
  secondaryCta: CTA;
}

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export interface FooterConfig {
  tagline: string;
  columns: FooterColumn[];
  copyright: string;
}

export interface NavConfig {
  links: NavLink[];
  loginCta: CTA;
  primaryCta: CTA;
}

export interface SiteConfig {
  brand: BrandConfig;
  nav: NavConfig;
  hero: HeroConfig;
  trustBar: TrustBarConfig;
  howItWorks: HowItWorksConfig;
  features: FeatureGridConfig;
  calculator: CalculatorConfig;
  pricing: PricingConfig;
  testimonials: TestimonialsConfig;
  faq: FAQConfig;
  finalCta: FinalCtaConfig;
  footer: FooterConfig;
  problemComparison: ProblemComparisonConfig;
  visualPipeline: VisualPipelineConfig;
}

export interface ComparisonItem {
  title: string;
  description: string;
  items: string[];
}

export interface ProblemComparisonConfig {
  eyebrow: string;
  heading: string;
  subheading: string;
  manual: ComparisonItem;
  automated: ComparisonItem;
}

export interface VisualPipelineConfig {
  eyebrow: string;
  heading: string;
  subheading: string;
}

/**
 * Seasonal campaign. Flip `active` (and nothing else) to switch the whole site
 * between normal and campaign mode. Legal: generic football/tournament theme
 * only — no FIFA/World Cup marks, trophy, team names, crests, or official logos.
 */
export interface SeasonalCampaign {
  active: boolean;
  theme: string;
  label: string;
  bannerText: string;
  discountPct: number;
  /** ISO date. Campaign auto-deactivates after this instant. */
  endDate: string;
  /** Generic flag-color accents for the banner sweep. */
  accentColors: string[];
  cta: CTA;
}

export interface ThemeConfig {
  seasonalCampaign: SeasonalCampaign;
}
