/**
 * Article HTML helpers: inject stable heading ids and extract a table of
 * contents from H2/H3 elements. Pure string transforms so they work both in the
 * browser and in the build-time prerender script.
 */
export interface TocEntry {
  id: string;
  text: string;
  level: 2 | 3;
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export interface ProcessedArticle {
  html: string;
  toc: TocEntry[];
}

/** Adds `id` to each h2/h3 (if missing) and returns the ToC. */
export function processArticle(rawHtml: string): ProcessedArticle {
  const toc: TocEntry[] = [];
  const used = new Set<string>();

  const html = rawHtml.replace(
    /<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi,
    (_match, levelStr: string, attrs: string, inner: string) => {
      const level = Number(levelStr) as 2 | 3;
      const text = inner.replace(/<[^>]+>/g, "").trim();
      let id = slugifyHeading(text) || `section-${toc.length + 1}`;
      while (used.has(id)) id = `${id}-${toc.length + 1}`;
      used.add(id);
      toc.push({ id, text, level });

      const hasId = /\bid\s*=/.test(attrs);
      const newAttrs = hasId ? attrs : `${attrs} id="${id}"`;
      return `<h${level}${newAttrs}>${inner}</h${level}>`;
    },
  );

  return { html, toc };
}
