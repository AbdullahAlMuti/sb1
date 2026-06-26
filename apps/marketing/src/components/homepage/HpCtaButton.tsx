/**
 * CTA button for homepage sections. Works with the DB `HpCta` type
 * (which has an optional `event` field, unlike the compile-time `CTA` type).
 */
import { Button, type ButtonProps } from "@repo/ui/components/ui/button";
import { useNavigate } from "react-router-dom";
import type { MouseEvent, ReactNode } from "react";
import type { HpCta } from "@repo/types";
import { track } from "@/lib/analytics";

interface HpCtaButtonProps extends Omit<ButtonProps, "onClick"> {
  cta: HpCta;
  children?: ReactNode;
}

function smoothScrollTo(hash: string) {
  document.querySelector(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function HpCtaButton({ cta, children, ...rest }: HpCtaButtonProps) {
  const navigate = useNavigate();
  const label = children ?? cta.label;

  if (cta.external) {
    return (
      <Button asChild {...rest}>
        <a href={cta.href} target="_blank" rel="noopener noreferrer"
          onClick={() => cta.event && track(cta.event, { href: cta.href })}>
          {label}
        </a>
      </Button>
    );
  }

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (cta.event) track(cta.event, { href: cta.href });
    if (cta.href.startsWith("#")) {
      e.preventDefault();
      smoothScrollTo(cta.href);
      return;
    }
    navigate(cta.href);
  };

  return <Button onClick={handleClick} {...rest}>{label}</Button>;
}

export default HpCtaButton;
