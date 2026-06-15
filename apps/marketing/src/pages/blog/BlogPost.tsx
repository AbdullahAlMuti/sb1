import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Clock } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@repo/ui/components/ui/accordion";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import NotFound from "@repo/ui/feedback/NotFound";
import ArticleBody from "@/components/blog/ArticleBody";
import BlogCard from "@/components/blog/BlogCard";
import BlogCta from "@/components/blog/BlogCta";
import { getPostBySlug, getPublishedPosts, relatedPosts } from "@/lib/blog";
import { processArticle } from "@/lib/article";
import {
  useSeo,
  SITE_URL,
  articleJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
} from "@/lib/useSeo";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogPost() {
  const { slug = "" } = useParams();

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog", "post", slug],
    queryFn: () => getPostBySlug(slug),
  });
  const { data: allPosts = [] } = useQuery({
    queryKey: ["blog", "posts"],
    queryFn: getPublishedPosts,
  });

  const processed = useMemo(
    () => (post ? processArticle(post.content) : null),
    [post],
  );

  const url = `${SITE_URL}/blog/${slug}`;
  const jsonLd = useMemo(() => {
    if (!post) return [];
    const blocks: object[] = [
      articleJsonLd({
        url,
        headline: post.title,
        description: post.meta_description ?? post.excerpt ?? undefined,
        image: post.og_image_url ?? post.cover_image_url ?? undefined,
        authorName: post.author?.name,
        datePublished: post.published_at ?? undefined,
        dateModified: post.updated_at,
      }),
      breadcrumbJsonLd([
        { name: "Blog", url: `${SITE_URL}/blog` },
        ...(post.category
          ? [
              {
                name: post.category.name,
                url: `${SITE_URL}/blog/category/${post.category.slug}`,
              },
            ]
          : []),
        { name: post.title, url },
      ]),
    ];
    const faq = faqJsonLd(post.faq);
    if (faq) blocks.push(faq);
    return blocks;
  }, [post, url]);

  useSeo({
    title: post ? `${post.seo_title ?? post.title} | SellerSuit` : "Article | SellerSuit",
    description: post?.meta_description ?? post?.excerpt ?? undefined,
    canonical: post?.canonical_url ?? url,
    image: post?.og_image_url ?? post?.cover_image_url ?? undefined,
    type: "article",
    jsonLd,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container px-4 pt-32 text-muted-foreground">Loading…</main>
        <Footer />
      </div>
    );
  }

  if (!post || !processed) return <NotFound />;

  const related = relatedPosts(allPosts, post);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24">
        <article className="container max-w-3xl px-4 py-10">
          <Link
            to="/blog"
            className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            All articles
          </Link>

          <header className="mb-8">
            {post.category && (
              <Link
                to={`/blog/category/${post.category.slug}`}
                className="text-sm font-semibold uppercase tracking-wide text-primary hover:underline"
              >
                {post.category.name}
              </Link>
            )}
            <h1 className="mt-2 font-display text-4xl font-bold leading-tight tracking-tight">
              {post.title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {post.author && <span>By {post.author.name}</span>}
              <span>·</span>
              <span>{formatDate(post.published_at)}</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {post.reading_minutes} min read
              </span>
            </div>
          </header>

          {post.cover_image_url && (
            <img
              src={post.cover_image_url}
              alt={post.title}
              className="mb-8 aspect-[16/9] w-full rounded-2xl object-cover"
            />
          )}

          {processed.toc.length >= 3 && (
            <nav className="mb-8 rounded-2xl border border-border bg-secondary/30 p-5">
              <p className="mb-3 text-sm font-semibold">In this article</p>
              <ul className="space-y-1.5 text-sm">
                {processed.toc.map((t) => (
                  <li key={t.id} className={t.level === 3 ? "pl-4" : ""}>
                    <a
                      href={`#${t.id}`}
                      className="text-muted-foreground hover:text-primary"
                    >
                      {t.text}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <ArticleBody html={processed.html} />

          {post.faq.length > 0 && (
            <section className="mt-12">
              <h2 className="mb-4 font-display text-2xl font-bold">
                Frequently asked questions
              </h2>
              <Accordion type="single" collapsible>
                {post.faq.map((f, i) => (
                  <AccordionItem key={i} value={`faq-${i}`}>
                    <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                    <AccordionContent>{f.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          )}

          <BlogCta />
        </article>

        {related.length > 0 && (
          <section className="border-t border-border bg-secondary/20 py-12">
            <div className="container px-4">
              <h2 className="mb-6 font-display text-2xl font-bold">Related articles</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((p) => (
                  <BlogCard key={p.id} post={p} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
