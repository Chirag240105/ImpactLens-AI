import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { ChevronsLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MediaThumb } from './MediaThumb';

/**
 * Two-image reveal slider. Pointer drag is rAF-throttled; arrow keys move 2% (10% with Shift),
 * Home/End jump to the edges. Exposed to assistive tech as a slider.
 */
export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = 'Before',
  afterLabel = 'After',
  className,
}: {
  beforeSrc?: string;
  afterSrc?: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}) {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const dragging = useRef(false);

  const moveTo = useCallback((clientX: number) => {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
    });
  }, []);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    moveTo(e.clientX);
  };
  const onKey = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 2;
    const next = { ArrowLeft: pos - step, ArrowDown: pos - step, ArrowRight: pos + step, ArrowUp: pos + step, Home: 0, End: 100 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    setPos(Math.max(0, Math.min(100, next)));
  };

  return (
    <div
      ref={ref}
      className={cn('relative aspect-[3/2] touch-none overflow-hidden rounded-lg bg-surface-alt select-none', className)}
      onPointerDown={onPointerDown}
      onPointerMove={(e) => dragging.current && moveTo(e.clientX)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      <MediaThumb src={afterSrc} alt={afterLabel} className="absolute inset-0" eager />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <MediaThumb src={beforeSrc} alt={beforeLabel} className="absolute inset-0" eager />
      </div>
      <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-media-glass px-2.5 py-1 text-label font-semibold text-on-media">{beforeLabel}</span>
      <span className="pointer-events-none absolute top-3 right-3 rounded-full bg-media-glass px-2.5 py-1 text-label font-semibold text-on-media">{afterLabel}</span>
      <div className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-on-media shadow-md" style={{ left: `${pos}%` }} />
      <div
        role="slider"
        tabIndex={0}
        aria-label="Reveal before and after"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        aria-valuetext={`${Math.round(pos)}% before image shown`}
        onKeyDown={onKey}
        className="absolute top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize place-items-center rounded-full border-2 border-on-media bg-accent text-on-media shadow-lg focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus pointer-coarse:size-14"
        style={{ left: `${pos}%` }}
      >
        <ChevronsLeftRight className="size-5" aria-hidden />
      </div>
    </div>
  );
}
