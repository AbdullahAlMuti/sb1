/**
 * Blog data layer for the marketing site.
 *
 * Reads the company blog from Supabase (`marketing_posts` + `marketing_categories`
 * + `marketing_authors`). RLS allows anonymous read of `status = 'published'` rows.
 *
 * The generated Database types don't yet include these tables, so we query through
 * a lightly-cast client and map rows onto the hand-written types in
 * `@repo/types` (marketing-blog.types). Once the migration is applied and types are
 * regenerated, the cast can be removed.
 */
import { supabase } from "@repo/api-client/supabase/client";
import type {
  MarketingCategory,
  MarketingPostWithRelations,
} from "@repo/types";
import { SAMPLE_POSTS, SAMPLE_CATEGORIES } from "./blog-sample";

// Untyped escape hatch until supabase types are regenerated with marketing_* tables.
type AnyQuery = {
  from: (table: string) => any;
};
const db = supabase as unknown as AnyQuery;

const POST_SELECT = `
  id, slug, title, excerpt, content, cover_image_url, category_id, author_id,
  status, published_at, seo_title, meta_description, canonical_url, og_image_url,
  keywords, reading_minutes, faq, created_at, updated_at,
  category:marketing_categories ( id, slug, name, description, sort_order, created_at, updated_at ),
  author:marketing_authors ( id, slug, name, avatar_url, bio, created_at, updated_at )
`;

function rowToPost(row: any): MarketingPostWithRelations {
  return {
    ...row,
    keywords: Array.isArray(row.keywords) ? row.keywords : [],
    faq: Array.isArray(row.faq) ? row.faq : [],
    category: row.category ?? null,
    author: row.author ?? null,
  } as MarketingPostWithRelations;
}

/** All published posts, newest first. */
export async function getPublishedPosts(): Promise<MarketingPostWithRelations[]> {
  try {
    const { data, error } = await db
      .from("marketing_posts")
      .select(POST_SELECT)
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (error) throw error;
    if (data && data.length) return data.map(rowToPost);
    return import.meta.env.DEV ? SAMPLE_POSTS : [];
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn("[blog] falling back to sample posts:", err);
      return SAMPLE_POSTS;
    }
    return [];
  }
}

/** A single published post by slug, or null. */
export async function getPostBySlug(
  slug: string,
): Promise<MarketingPostWithRelations | null> {
  try {
    const { data, error } = await db
      .from("marketing_posts")
      .select(POST_SELECT)
      .eq("status", "published")
      .eq("slug", slug)
      .maybeSingle();

    if (error) throw error;
    if (data) return rowToPost(data);
    return import.meta.env.DEV
      ? SAMPLE_POSTS.find((p) => p.slug === slug) ?? null
      : null;
  } catch (err) {
    if (import.meta.env.DEV) {
      return SAMPLE_POSTS.find((p) => p.slug === slug) ?? null;
    }
    return null;
  }
}

/** Published posts within a category slug. */
export async function getPostsByCategory(
  categorySlug: string,
): Promise<MarketingPostWithRelations[]> {
  const posts = await getPublishedPosts();
  return posts.filter((p) => p.category?.slug === categorySlug);
}

/** All categories, ordered. */
export async function getCategories(): Promise<MarketingCategory[]> {
  try {
    const { data, error } = await db
      .from("marketing_categories")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) throw error;
    if (data && data.length) return data as MarketingCategory[];
    return import.meta.env.DEV ? SAMPLE_CATEGORIES : [];
  } catch {
    return import.meta.env.DEV ? SAMPLE_CATEGORIES : [];
  }
}

/** Up to `limit` related posts in the same category (excluding the current one). */
export function relatedPosts(
  all: MarketingPostWithRelations[],
  current: MarketingPostWithRelations,
  limit = 3,
): MarketingPostWithRelations[] {
  return all
    .filter(
      (p) => p.id !== current.id && p.category?.slug === current.category?.slug,
    )
    .slice(0, limit);
}
