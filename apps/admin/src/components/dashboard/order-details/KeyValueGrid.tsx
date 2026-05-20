import * as React from "react";

export function KeyValueGrid(props: {
  items: Array<{ label: string; value: React.ReactNode }>;
  columns?: "1" | "2";
}) {
  const cols = props.columns === "1" ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2";
  return (
    <div className={`grid ${cols} gap-x-4 gap-y-1`}> 
      {props.items.map((it) => (
        <div key={it.label} className="flex items-baseline justify-between gap-3">
          <span className="text-[10px] text-muted-foreground">{it.label}</span>
          <span className="text-[11px] font-medium tabular-nums">{it.value}</span>
        </div>
      ))}
    </div>
  );
}
