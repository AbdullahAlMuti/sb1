/**
 * CommunityLinks — eyebrow + H2 + intro, then 4 link cards.
 * Each card: icon, channel name, blurb, action label + href.
 */
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { HpCommunity } from "@repo/types";
import { Icon } from "./LucideResolver";
import { Reveal } from "@/components/primitives/Reveal";

interface CommunityLinksProps { community: HpCommunity }

function isExternal(href: string) {
  return href.startsWith("http://") || href.startsWith("https://");
}

export function CommunityLinks({ community }: CommunityLinksProps) {
  return (
    <section className="border-b border-border bg-secondary/20 py-20">
      <div className="container px-4">
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
            {community.eyebrow}
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl text-balance">
            {community.heading}
          </h2>
          <p className="mt-4 text-base text-muted-foreground leading-7">{community.intro}</p>
        </Reveal>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {community.channels.map((ch, i) => {
            const external = isExternal(ch.href);
            const inner = (
              <div className="flex h-full flex-col rounded-xl border border-border bg-card p-6 shadow-soft-sm transition-all hover:shadow-soft-md hover:border-primary/30">
                <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon name={ch.icon} className="h-5 w-5" />
                </span>
                <h3 className="font-display text-base font-semibold text-foreground">{ch.name}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{ch.blurb}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  {ch.actionLabel}
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            );

            return (
              <Reveal key={i} delay={i * 0.07} as="div">
                {external ? (
                  <a href={ch.href} target="_blank" rel="noopener noreferrer" className="block h-full">{inner}</a>
                ) : (
                  <Link to={ch.href} className="block h-full">{inner}</Link>
                )}
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default CommunityLinks;
