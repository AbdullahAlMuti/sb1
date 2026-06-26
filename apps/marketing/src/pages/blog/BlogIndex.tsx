import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import BlogCard from "@/components/blog/BlogCard";
import { getPublishedPosts, getCategories } from "@/lib/blog";
import { useSeo, SITE_URL } from "@/lib/useSeo";

export default function BlogIndex() {
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["blog", "posts"],
    queryFn: getPublishedPosts,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["blog", "categories"],
    queryFn: getCategories,
  });

  useSeo({
    title: "SellerSuit Blog — eBay Dropshipping Guides & Tips",
    description:
      "Guides, strategies, and tutorials for eBay dropshipping: sourcing from Amazon and Walmart, product research, fees, and automation.",
    canonical: `${SITE_URL}/blog`,
  });

  const [featured, ...rest] = posts;

  return (
    <div className="pt-24 flex-1">
      <div className="container px-4 py-10">
          <header className="mb-10 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              SellerSuit Blog
            </p>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">
              eBay dropshipping, made simple
            </h1>
            <p className="mt-3 text-muted-foreground">
              Actionable guides on sourcing, listing, pricing, and scaling a
              profitable eBay store.
            </p>
          </header>

          {categories.length > 0 && (
            <nav className="mb-8 flex flex-wrap gap-2">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  to={`/blog/category/${c.slug}`}
                  className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {c.name}
                </Link>
              ))}
            </nav>
          )}

          {isLoading ? (
            <p className="text-muted-foreground">Loading articles…</p>
          ) : posts.length === 0 ? (
            <p className="text-muted-foreground">No articles yet — check back soon.</p>
          ) : (
            <>
              {featured && (
                <div className="mb-10">
                  <BlogCard post={featured} />
                </div>
              )}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((post) => (
                  <BlogCard key={post.id} post={post} />
                ))}
              </div>
            </>
          )}
        </div>
    </div>
  );
}
