/**
 * Type definitions for the DB-backed homepage content store.
 * All marketing copy for the Bindplane-style homepage lives here.
 * Icons are stored as Lucide icon name strings (resolved to components client-side).
 * CTAs that are compile-time analytics events use an optional `event` field.
 */

export interface HpCta {
  label: string;
  href: string;
  event?: string;
  external?: boolean;
}

// ── Announcement bar ────────────────────────────────────────────────────────

export interface HpAnnouncement {
  /** Short message shown in the banner, e.g. "Tournament Season Sale — 25% off Starter & Pro." */
  message: string;
  link: { label: string; href: string };
  /** Array of CSS color strings used for the gradient accent line. */
  accentColors: string[];
}

// ── Navigation ───────────────────────────────────────────────────────────────

export interface HpNavMegaItem {
  icon: string;          // Lucide icon name
  title: string;
  subtitle: string;
  href: string;
}

export interface HpNavMegaGroup {
  heading?: string;
  items: HpNavMegaItem[];
}

export interface HpNavMegaDrop {
  label: string;
  groups: HpNavMegaGroup[];
}

export interface HpNav {
  /** Flat links shown in the nav bar (non-dropdown). */
  links: Array<{ label: string; href: string }>;
  /** Mega-menu dropdown entries. */
  megaDrops: HpNavMegaDrop[];
  loginCta: HpCta;
  primaryCta: HpCta;
}

// ── Hero ─────────────────────────────────────────────────────────────────────

export interface HpHero {
  eyebrow: string;
  titleLead: string;
  titleHighlight: string;
  subtitle: string;
  primaryCta: HpCta;
  secondaryCta: HpCta;
  heroImageSrc?: string;
  heroImageAlt?: string;
  stats: Array<{ value: string; label: string }>;
}

// ── Logo Cloud ────────────────────────────────────────────────────────────────

export interface HpLogoCloud {
  heading: string;
  proof?: string;
  logos: Array<{ name: string; src: string; href?: string }>;
}

// ── Use Cases ────────────────────────────────────────────────────────────────

export interface HpUseCaseCard {
  heading: string;
  description: string;
  imageSrc?: string;
  imageAlt?: string;
  icon?: string;         // Lucide icon name (used when no image)
}

export interface HpUseCases {
  eyebrow: string;
  heading: string;
  intro: string;
  cards: HpUseCaseCard[];
}

// ── Benefits ─────────────────────────────────────────────────────────────────

export interface HpBenefitItem {
  icon: string;          // Lucide icon name
  label: string;
  description?: string;
}

export interface HpBenefits {
  eyebrow: string;
  heading: string;
  intro: string;
  items: HpBenefitItem[];
}

// ── Features (numbered, alternating layout) ──────────────────────────────────

export interface HpFeatureBullet {
  icon: string;          // Lucide icon name
  label: string;
}

export interface HpFeatureBlock {
  number: number;
  heading: string;
  description: string;
  bullets: HpFeatureBullet[];
  imageSrc?: string;
  imageAlt?: string;
}

export interface HpFeatures {
  eyebrow: string;
  heading: string;
  intro: string;
  blocks: HpFeatureBlock[];
}

// ── Trust / Certifications ────────────────────────────────────────────────────

export interface HpTrustBadge {
  label: string;
  imageSrc?: string;
  description?: string;
}

export interface HpTrust {
  eyebrow: string;
  heading: string;
  paragraph: string;
  paragraphLink?: { label: string; href: string };
  badges: HpTrustBadge[];
}

// ── Mission / Technology ─────────────────────────────────────────────────────

export interface HpMission {
  eyebrow: string;
  heading: string;
  paragraph: string;
  cta: HpCta;
}

// ── Community ────────────────────────────────────────────────────────────────

export interface HpCommunityChannel {
  name: string;
  blurb: string;
  actionLabel: string;
  href: string;
  icon: string;          // Lucide icon name
}

export interface HpCommunity {
  eyebrow: string;
  heading: string;
  intro: string;
  channels: HpCommunityChannel[];
}

// ── Final CTA ────────────────────────────────────────────────────────────────

export interface HpFinalCta {
  heading: string;
  subheading?: string;
  primaryCta: HpCta;
  secondaryCta: HpCta;
}

// ── Footer ────────────────────────────────────────────────────────────────────

export interface HpFooterLink {
  label: string;
  href: string;
}

export interface HpFooterColumn {
  title: string;
  links: HpFooterLink[];
}

export interface HpFooterSocial {
  name: string;
  href: string;
  icon: string;          // Lucide icon name
}

export interface HpFooterBadge {
  label: string;
  href?: string;
}

export interface HpFooter {
  tagline: string;
  columns: HpFooterColumn[];
  badges: HpFooterBadge[];
  social: HpFooterSocial[];
  copyright: string;
}

// ── Root content record ───────────────────────────────────────────────────────

export interface HomepageContent {
  announcement: HpAnnouncement;
  nav: HpNav;
  hero: HpHero;
  logo_cloud: HpLogoCloud;
  use_cases: HpUseCases;
  benefits: HpBenefits;
  features: HpFeatures;
  trust: HpTrust;
  mission: HpMission;
  community: HpCommunity;
  final_cta: HpFinalCta;
  footer: HpFooter;
}

/** Shape returned by the homepage-content Edge Function. */
export interface HomepageContentResponse {
  content: HomepageContent;
  version: number;
  updatedAt: string;
}
