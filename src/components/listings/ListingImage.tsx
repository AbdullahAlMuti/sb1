import * as React from "react";
import { Package as PackageIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function buildAmazonFallbackUrls(asin: string): string[] {
  const clean = asin.trim();
  if (!clean) return [];

  // Amazon's legacy host often fails now; m.media-amazon.com tends to work more reliably.
  // Keep multiple fallbacks in case one format is blocked/unavailable.
  return [
    `https://m.media-amazon.com/images/P/${clean}.01._SCLZZZZZZZ_.jpg`,
    `https://m.media-amazon.com/images/P/${clean}.01._SL240_.jpg`,
    `https://images-na.ssl-images-amazon.com/images/P/${clean}.01._SCLZZZZZZZ_.jpg`,
  ];
}

type Props = {
  title?: string | null;
  imageUrl?: string | null;
  amazonAsin?: string | null;
  className?: string;
};

export function ListingImage({ title, imageUrl, amazonAsin, className }: Props) {
  const candidates = React.useMemo(() => {
    const urls = [imageUrl, ...(amazonAsin ? buildAmazonFallbackUrls(amazonAsin) : [])]
      .filter(Boolean)
      .map(String);
    // De-dupe
    return Array.from(new Set(urls));
  }, [amazonAsin, imageUrl]);

  const [idx, setIdx] = React.useState(0);
  const src = idx < candidates.length ? candidates[idx] : undefined;

  // Reset when listing changes
  React.useEffect(() => {
    setIdx(0);
  }, [candidates.join("|")]);

  const showFallback = !src;

  return (
    <div
      className={cn(
        "h-7 w-7 rounded bg-muted/50 border border-border/50 flex items-center justify-center overflow-hidden",
        className
      )}
    >
      {src ? (
        <img
          src={src}
          alt={title || "Product"}
          className="h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => {
            // Try next candidate before falling back to the icon
            setIdx((prev) => {
              const next = prev + 1;
              return next <= candidates.length ? next : prev;
            });
          }}
        />
      ) : null}
      <PackageIcon
        className={cn(
          "h-3 w-3 text-muted-foreground/50",
          showFallback ? "block" : "hidden"
        )}
        aria-hidden
      />
    </div>
  );
}
