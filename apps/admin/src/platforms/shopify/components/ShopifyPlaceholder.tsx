import React from "react";

export function ShopifyPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
      <p className="text-sm text-muted-foreground">{title} configuration coming soon.</p>
    </div>
  );
}
