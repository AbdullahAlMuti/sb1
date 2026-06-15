import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import type { MarketingPostWithRelations } from "@repo/types";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Card used on the blog index + category + related lists. */
export default function BlogCard({ post }: { post: MarketingPostWithRelations }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-soft-lg">
      <Link to={`/blog/${post.slug}`} className="block">
        <div className="aspect-[16/9] overflow-hidden bg-secondary/40">
          {post.cover_image_url ? (
            <img
              src={post.cover_image_url}
              alt={post.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 text-2xl font-display font-bold text-primary/40">
              {post.category?.name ?? "SellerSuit"}
            </div>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        {post.category && (
          <Link
            to={`/blog/category/${post.category.slug}`}
            className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary hover:underline"
          >
            {post.category.name}
          </Link>
        )}
        <h3 className="mb-2 font-display text-lg font-bold leading-snug">
          <Link to={`/blog/${post.slug}`} className="hover:text-primary">
            {post.title}
          </Link>
        </h3>
        {post.excerpt && (
          <p className="mb-4 line-clamp-3 text-sm leading-6 text-muted-foreground">
            {post.excerpt}
          </p>
        )}
        <div className="mt-auto flex items-center gap-3 text-xs text-muted-foreground">
          <span>{formatDate(post.published_at)}</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {post.reading_minutes} min read
          </span>
        </div>
      </div>
    </article>
  );
}
