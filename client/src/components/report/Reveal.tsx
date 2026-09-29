import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * One-shot fade-up when a section enters the viewport (DESIGN.md L2, public report only).
 * Skipped for reduced motion and coarse pointers, where content renders immediately.
 */
export function Reveal({ children, className, as: As = 'section', id }: { children: ReactNode; className?: string; as?: 'section' | 'div'; id?: string }) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(() =>
    typeof window === 'undefined' || !('IntersectionObserver' in window)
      ? true
      : window.matchMedia('(prefers-reduced-motion: reduce), (pointer: coarse)').matches,
  );
  useEffect(() => {
    if (shown || !ref.current) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [shown]);
  return (
    <As
      ref={ref as never}
      id={id}
      className={cn(
        '[content-visibility:auto] [contain-intrinsic-size:auto_480px] transition-[opacity,transform] duration-500 ease-brand-out',
        shown ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
        className,
      )}
    >
      {children}
    </As>
  );
}
