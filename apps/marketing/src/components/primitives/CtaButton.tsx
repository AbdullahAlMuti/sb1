import { Button, type ButtonProps } from "@repo/ui/components/ui/button";
import { useNavigate } from "react-router-dom";
import type { MouseEvent, ReactNode } from "react";
import { cn } from "@repo/ui/lib/utils";
import type { CTA } from "@/config/types";
import { track } from "@/lib/analytics";

interface CtaButtonProps extends Omit<ButtonProps, "onClick"> {
  cta: CTA;
  trackProps?: Record<string, unknown>;
  children?: ReactNode;
}

const MARKETING_PILL = "min-h-11 rounded-full font-medium transition-transform active:scale-95";

function smoothScrollTo(hash: string) {
  const el = document.querySelector(hash);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", hash);
  }
}

/**
 * The single CTA component for the site. Every call fires `track(cta.event)`,
 * which structurally guarantees analytics on every CTA click. Handles:
 *  - external links  → new tab
 *  - hash links (#x) → smooth scroll
 *  - everything else → SPA navigation
 */
export function CtaButton({ cta, trackProps, children, ...buttonProps }: CtaButtonProps) {
  const navigate = useNavigate();
  const label = children ?? cta.label;

  if (cta.external) {
    return (
      <Button asChild {...buttonProps} className={cn(MARKETING_PILL, buttonProps.className)}>
        <a
          href={cta.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track(cta.event, { href: cta.href, ...trackProps })}
        >
          {label}
        </a>
      </Button>
    );
  }

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    track(cta.event, { href: cta.href, ...trackProps });
    if (cta.href.startsWith("#")) {
      e.preventDefault();
      smoothScrollTo(cta.href);
      return;
    }
    navigate(cta.href);
  };

  return (
    <Button onClick={handleClick} {...buttonProps} className={cn(MARKETING_PILL, buttonProps.className)}>
      {label}
    </Button>
  );
}

export default CtaButton;
