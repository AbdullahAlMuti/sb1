import { useMemo } from "react";
import DOMPurify from "dompurify";

/**
 * Renders stored blog HTML safely inside a Tailwind `prose` container.
 * Content is sanitized with DOMPurify before injection. `loading="lazy"` is
 * applied to images post-sanitize for Core Web Vitals.
 */
export default function ArticleBody({ html }: { html: string }) {
  const clean = useMemo(() => {
    const sanitized = DOMPurify.sanitize(html, {
      ADD_ATTR: ["target", "rel", "loading"],
      FORBID_TAGS: ["style", "script", "iframe"],
    });
    // Encourage lazy-loading on any images in the stored content.
    return sanitized.replace(/<img /g, '<img loading="lazy" ');
  }, [html]);

  return (
    <div
      className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-display prose-headings:scroll-mt-24 prose-a:text-primary prose-img:rounded-xl"
      // content is sanitized with DOMPurify above before injection
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
