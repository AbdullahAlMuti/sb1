import { useReducedMotion as useFramerReducedMotion } from "framer-motion";

/**
 * SSR-safe boolean wrapper around framer-motion's reduced-motion hook.
 * Returns `true` when the user prefers reduced motion, so sections can render
 * static fallbacks instead of animating.
 */
export function useReducedMotion(): boolean {
  return useFramerReducedMotion() ?? false;
}
