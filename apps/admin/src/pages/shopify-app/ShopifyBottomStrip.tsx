import React from "react";
import { Settings2, ShieldCheck, Clock, FileText, Eye, RefreshCw } from "lucide-react";

export default function ShopifyBottomStrip() {
  const cards = [
    {
      icon: Settings2,
      title: "Full Control",
      desc: "Enable, disable and customize every dashboard page.",
    },
    {
      icon: ShieldCheck,
      title: "Plan Based Access",
      desc: "Control which plans can access each page.",
    },
    {
      icon: Clock,
      title: "Usage Limits",
      desc: "Set daily, monthly or total usage limits.",
    },
    {
      icon: FileText,
      title: "Content Management",
      desc: "Edit content, sections and SEO for each page.",
    },
    {
      icon: Eye,
      title: "Visibility Control",
      desc: "Show or hide pages from sidebar & users.",
    },
    {
      icon: RefreshCw,
      title: "Real-time Changes",
      desc: "All changes reflect instantly for users.",
    },
  ];

  return (
    <div className="mt-8 w-full">
      <h3 className="text-sm font-semibold mb-4">Why Pages & Features Control is Important?</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 w-full">
        {cards.map((card, i) => (
          <div key={i} className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors">
            <div className="flex items-center gap-2">
              <card.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <h4 className="text-xs font-semibold">{card.title}</h4>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
