/**
 * Minimal client-side SEO head manager. No external dependency — it imperatively
 * sets <title>, meta description, canonical, OG/Twitter tags, and injects JSON-LD
 * for the current route. This covers the SPA/runtime case; the build-time
 * prerender (scripts/prerender-blog.mjs) bakes the same tags into static HTML so
 * crawlers and social scrapers (which don't run JS) get them on first response.
 */
import { useEffect } from "react";
import type { MarketingFaqItem } from "@repo/types";

export const SITE_URL = "https://www.sellersuit.com";

export interface SeoInput {
  title: string;
  description?: string;
  canonical?: string;
  image?: string;
  /** "website" | "article" */
  type?: string;
  /** JSON-LD objects to inject (Article, BreadcrumbList, FAQPage, ...). */
  jsonLd?: object[];
}

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function useSeo(input: SeoInput): void {
  useEffect(() => {
    const {
      title,
      description,
      canonical,
      image = `${SITE_URL}/logo.png`,
      type = "website",
      jsonLd = [],
    } = input;

    const prevTitle = document.title;
    document.title = title;

    if (description) {
      upsertMeta("name", "description", description);
      upsertMeta("property", "og:description", description);
      upsertMeta("name", "twitter:description", description);
    }
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:image", image);
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:image", image);
    if (canonical) {
      upsertMeta("property", "og:url", canonical);
      upsertLink("canonical", canonical);
    }

    // Inject JSON-LD (tagged so we can clean it up on unmount).
    const scripts: HTMLScriptElement[] = jsonLd.map((obj) => {
      const s = document.createElement("script");
      s.type = "application/ld+json";
      s.dataset.seo = "blog";
      s.text = JSON.stringify(obj);
      document.head.appendChild(s);
      return s;
    });

    return () => {
      document.title = prevTitle;
      scripts.forEach((s) => s.remove());
    };
    // Serialize so we only re-run when the actual SEO values change, not on
    // every render (callers pass a fresh object literal each time).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(input)]);
}

// ---- JSON-LD builders (shared with the prerender script via duplication-free shapes) ----

export function articleJsonLd(opts: {
  url: string;
  headline: string;
  description?: string;
  image?: string;
  authorName?: string;
  datePublished?: string;
  dateModified?: string;
}): object {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    mainEntityOfPage: { "@type": "WebPage", "@id": opts.url },
    headline: opts.headline,
    description: opts.description,
    image: opts.image ? [opts.image] : undefined,
    author: { "@type": "Organization", name: opts.authorName ?? "SellerSuit" },
    publisher: {
      "@type": "Organization",
      name: "SellerSuit",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
    },
    datePublished: opts.datePublished,
    dateModified: opts.dateModified ?? opts.datePublished,
  };
}

export function breadcrumbJsonLd(
  items: { name: string; url: string }[],
): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export function faqJsonLd(faq: MarketingFaqItem[]): object | null {
  if (!faq || faq.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}
