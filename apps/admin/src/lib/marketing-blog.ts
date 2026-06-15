/**
 * Admin data layer for the company marketing blog (marketing_posts and friends).
 * Admins have full RLS access. Types come from @repo/types; the supabase client is
 * cast loosely until the generated Database types include the marketing_* tables.
 */
import { supabase } from "@repo/api-client/supabase/client";
import type {
  MarketingAuthor,
  MarketingCategory,
  MarketingPost,
  MarketingPostFormValues,
  MarketingPostWithRelations,
} from "@repo/types";

type AnyQuery = { from: (t: string) => any };
const db = supabase as unknown as AnyQuery;

const SELECT = `
  id, slug, title, excerpt, content, cover_image_url, category_id, author_id,
  status, published_at, seo_title, meta_description, canonical_url, og_image_url,
  keywords, reading_minutes, faq, created_at, updated_at,
  category:marketing_categories ( id, slug, name, description, sort_order, created_at, updated_at ),
  author:marketing_authors ( id, slug, name, avatar_url, bio, created_at, updated_at )`;

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

/** ~200 words/min reading estimate from HTML content. */
export function estimateReadingMinutes(html: string): number {
  const words = html.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export async function listPosts(): Promise<MarketingPostWithRelations[]> {
  const { data, error } = await db
    .from("marketing_posts")
    .select(SELECT)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []) as MarketingPostWithRelations[];
}

export async function getPost(id: string): Promise<MarketingPostWithRelations | null> {
  const { data, error } = await db.from("marketing_posts").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as MarketingPostWithRelations) ?? null;
}

export async function listCategories(): Promise<MarketingCategory[]> {
  const { data, error } = await db
    .from("marketing_categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data || []) as MarketingCategory[];
}

export async function listAuthors(): Promise<MarketingAuthor[]> {
  const { data, error } = await db.from("marketing_authors").select("*").order("name");
  if (error) throw error;
  return (data || []) as MarketingAuthor[];
}

function toRow(values: MarketingPostFormValues): Record<string, unknown> {
  const status = values.status;
  return {
    slug: slugify(values.slug || values.title),
    title: values.title,
    excerpt: values.excerpt || null,
    content: values.content || "",
    cover_image_url: values.cover_image_url || null,
    category_id: values.category_id || null,
    author_id: values.author_id || null,
    status,
    published_at:
      status === "published"
        ? values.published_at || new Date().toISOString()
        : values.published_at || null,
    seo_title: values.seo_title || null,
    meta_description: values.meta_description || null,
    canonical_url: values.canonical_url || null,
    og_image_url: values.og_image_url || null,
    keywords: values.keywords || [],
    reading_minutes: estimateReadingMinutes(values.content || ""),
    faq: values.faq || [],
  };
}

export async function createPost(values: MarketingPostFormValues): Promise<MarketingPost> {
  const { data, error } = await db
    .from("marketing_posts")
    .insert([toRow(values)])
    .select()
    .single();
  if (error) throw error;
  return data as MarketingPost;
}

export async function updatePost(
  id: string,
  values: MarketingPostFormValues,
): Promise<MarketingPost> {
  const { data, error } = await db
    .from("marketing_posts")
    .update(toRow(values))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as MarketingPost;
}

export async function deletePost(id: string): Promise<void> {
  const { error } = await db.from("marketing_posts").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Trigger a marketing-site rebuild so a newly published post goes live (the public
 * blog is statically prerendered at build). Best-effort: a missing deploy hook is a
 * no-op, never an error. Calls the `trigger-marketing-deploy` Edge Function which
 * holds the Vercel Deploy Hook URL server-side.
 */
export async function triggerSiteRebuild(): Promise<{ triggered: boolean; reason?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("trigger-marketing-deploy", {
      body: {},
    });
    if (error) return { triggered: false, reason: error.message };
    return { triggered: Boolean((data as any)?.triggered), reason: (data as any)?.reason };
  } catch (e) {
    return { triggered: false, reason: e instanceof Error ? e.message : "unknown" };
  }
}

/** Upload a cover/inline image to the public `blog-images` bucket; returns its URL. */
export async function uploadBlogImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "png";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("blog-images").upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("blog-images").getPublicUrl(path);
  return data.publicUrl;
}
