import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import BlogCard from "@/components/blog/BlogCard";
import { getPublishedPosts, getCategories } from "@/lib/blog";
import { useSeo, SITE_URL } from "@/lib/useSeo";

export default function BlogCategory() {
  const { slug = "" } = useParams();

  const { data: posts = [] } = useQuery({
    queryKey: ["blog", "posts"],
    queryFn: getPublishedPosts,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["blog", "categories"],
    queryFn: getCategories,
  });

  const category = categories.find((c) => c.slug === slug);
  const filtered = posts.filter((p) => p.category?.slug === slug);
  const name = category?.name ?? "Articles";

  useSeo({
    title: `${name} — SellerSuit Blog`,
    description:
      category?.description ??
      `${name} articles and guides from the SellerSuit blog.`,
    canonical: `${SITE_URL}/blog/category/${slug}`,
  });

  return (
    <div className="pt-24 flex-1">
      <div className="container px-4 py-10">
        <Link
          to="/blog"
          className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          All articles
        </Link>

        <header className="mb-10 max-w-2xl">
          <h1 className="font-display text-4xl font-bold tracking-tight">{name}</h1>
          {category?.description && (
            <p className="mt-3 text-muted-foreground">{category.description}</p>
          )}
        </header>

        {filtered.length === 0 ? (
          <p className="text-muted-foreground">No articles in this category yet.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
