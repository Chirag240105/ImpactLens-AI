import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { CountUp } from '@/components/ui/Misc';
import { Card } from '@/components/ui/Card';

export function StatCard({
  label,
  value,
  format,
  suffix,
  icon,
  foot,
  tone = 'accent',
  className,
}: {
  label: string;
  value: number;
  format?: (n: number) => string;
  suffix?: ReactNode;
  icon?: ReactNode;
  foot?: ReactNode;
  tone?: 'accent' | 'info' | 'inferred' | 'warning' | 'error';
  className?: string;
}) {
  const toneCls = {
    accent: 'bg-accent-soft text-accent',
    info: 'bg-info-soft text-info',
    inferred: 'bg-inferred-soft text-inferred',
    warning: 'bg-warning-soft text-warning',
    error: 'bg-error-soft text-error',
  }[tone];
  return (
    <Card className={cn('flex min-h-28 flex-col p-4', className)}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-meta font-medium text-ink-3">{label}</span>
        {icon && <span className={cn('grid size-8 place-items-center rounded-md [&_svg]:size-4', toneCls)} aria-hidden>{icon}</span>}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <CountUp value={value} format={format} className="font-display text-[1.75rem] leading-none font-bold tracking-[-0.02em]" />
        {suffix && <span className="text-meta text-ink-3">{suffix}</span>}
      </div>
      {foot && <div className="mt-auto pt-2 text-meta text-ink-3">{foot}</div>}
    </Card>
  );
}

export function CoverageRing({ percent, size = 88, stroke = 9, label = 'Evidence coverage' }: { percent: number; size?: number; stroke?: number; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, percent));
  const color = p >= 70 ? 'var(--accent)' : p >= 40 ? 'var(--warning)' : 'var(--error)';
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${p}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-sunken)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p / 100)}
          className="transition-[stroke-dashoffset] duration-700 ease-brand-out"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-xl font-bold tabular" aria-hidden>
        {p}
        <span className="ml-0.5 self-center text-xs text-ink-3">%</span>
      </span>
    </div>
  );
}

/** Horizontal bars for small categorical data (hand-rolled SVG-free bars keep the bundle lean). */
export function BarList({
  items,
  valueLabel = (n: number) => String(n),
  emptyLabel = 'No data yet',
}: {
  items: Array<{ label: string; value: number; hint?: string }>;
  valueLabel?: (n: number) => string;
  emptyLabel?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <p className="text-meta text-ink-3">{emptyLabel}</p>;
  return (
    <ul className="grid gap-3">
      {items.map((it, idx) => (
        <li key={it.label}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-meta">
            <span className="truncate font-medium text-ink-2" title={it.hint}>
              {it.label}
            </span>
            <span className="tabular text-ink-3">{valueLabel(it.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-sunken">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-brand-out"
              style={{ width: `${(it.value / max) * 100}%`, background: `var(--viz-${(idx % 6) + 1})` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
