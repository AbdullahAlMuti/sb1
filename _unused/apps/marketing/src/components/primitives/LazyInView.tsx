import { useEffect, useRef, useState, type ReactNode } from "react";

interface LazyInViewProps {
  children: ReactNode;
  /** Rendered until the real children mount (reserve height to avoid layout shift). */
  placeholder?: ReactNode;
  className?: string;
  rootMargin?: string;
}

/**
 * Mounts `children` only once the wrapper nears the viewport. Used to defer
 * heavy below-the-fold animations so they don't block initial load.
 */
export function LazyInView({ children, placeholder, className, rootMargin = "200px" }: LazyInViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView, rootMargin]);

  return (
    <div ref={ref} className={className}>
      {inView ? children : placeholder ?? null}
    </div>
  );
}

export default LazyInView;
