import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Stagger delay in seconds for grids. */
  delay?: number;
  /** Travel distance in px before settling. */
  y?: number;
  as?: "div" | "li" | "article" | "section";
}

/**
 * Scroll-reveal wrapper: fades + slides children in when they enter the
 * viewport. Renders statically (no transform) under prefers-reduced-motion.
 */
export function Reveal({ children, className, delay = 0, y = 16, as = "div" }: RevealProps) {
  const reduced = useReducedMotion();
  const MotionTag = motion[as];

  if (reduced) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay, ease: [0.19, 1, 0.22, 1] }}
    >
      {children}
    </MotionTag>
  );
}

export default Reveal;
