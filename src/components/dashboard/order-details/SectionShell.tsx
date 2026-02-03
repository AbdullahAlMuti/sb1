import * as React from "react";

import { cn } from "@/lib/utils";

export function SectionShell(props: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-border p-2", props.className)}>
      <div className="text-[11px] font-semibold leading-none">{props.title}</div>
      <div className="mt-2">{props.children}</div>
    </section>
  );
}
