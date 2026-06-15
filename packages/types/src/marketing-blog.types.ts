/**
 * Types for the company marketing blog (apps/marketing /blog + apps/admin editor).
 *
 * NOTE: distinct from the per-user `blog_posts` feature (affiliate review posts).
 * These mirror the `marketing_posts` / `marketing_categories` / `marketing_authors`
 * tables created in migration 20260614040000_create_marketing_blog.sql.
 */

export type MarketingPostStatus = "draft" | "scheduled" | "published";

export interface MarketingFaqItem {
  q: string;
  a: string;
}

export interface MarketingAuthor {
  id: string;
  slug: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketingCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MarketingPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  /** Sanitized HTML body, rendered from the editor. */
  content: string;
  cover_image_url: string | null;
  category_id: string | null;
  author_id: string | null;
  status: MarketingPostStatus;
  published_at: string | null;
  seo_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  og_image_url: string | null;
  keywords: string[];
  reading_minutes: number;
  faq: MarketingFaqItem[];
  created_at: string;
  updated_at: string;
}

/** A post joined with its category + author, as rendered on the public site. */
export interface MarketingPostWithRelations extends MarketingPost {
  category: MarketingCategory | null;
  author: MarketingAuthor | null;
}

/** Editor form shape (admin). */
export interface MarketingPostFormValues {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover_image_url: string;
  category_id: string | null;
  author_id: string | null;
  status: MarketingPostStatus;
  published_at: string | null;
  seo_title: string;
  meta_description: string;
  canonical_url: string;
  og_image_url: string;
  keywords: string[];
  faq: MarketingFaqItem[];
}
