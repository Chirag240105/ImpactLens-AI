import { useEffect, useRef, useState, type ReactNode } from 'react';
import * as T from '@radix-ui/react-tooltip';
import * as M from '@radix-ui/react-dropdown-menu';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export function Tooltip({ content, children, side = 'top' }: { content: ReactNode; children: ReactNode; side?: 'top' | 'bottom' | 'left' | 'right' }) {
  if (!content) return <>{children}</>;
  return (
    <T.Root delayDuration={250}>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          sideOffset={6}
          className="z-[60] max-w-xs rounded-md bg-ink px-2.5 py-1.5 text-meta leading-snug text-inverse shadow-md data-[state=delayed-open]:animate-[fade-in_var(--dur-fast)_var(--ease-out)]"
        >
          {content}
          <T.Arrow className="fill-[var(--text)]" />
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
export const TooltipProvider = T.Provider;

export function Menu({ trigger, children, align = 'end' }: { trigger: ReactNode; children: ReactNode; align?: 'start' | 'end' }) {
  return (
    <M.Root>
      <M.Trigger asChild>{trigger}</M.Trigger>
      <M.Portal>
        <M.Content
          align={align}
          sideOffset={6}
          className="z-[60] min-w-44 rounded-lg border border-line bg-surface p-1 shadow-md data-[state=open]:animate-[fade-in_var(--dur-fast)_var(--ease-out)]"
        >
          {children}
        </M.Content>
      </M.Portal>
    </M.Root>
  );
}
export function MenuItem({
  children,
  icon,
  onSelect,
  danger,
  disabled,
}: {
  children: ReactNode;
  icon?: ReactNode;
  onSelect?: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <M.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        'touch-target flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-meta font-medium text-ink-2 outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface-hover data-[highlighted]:text-ink [&_svg]:size-4',
        danger && 'text-error data-[highlighted]:bg-error-soft data-[highlighted]:text-error',
      )}
    >
      {icon}
      {children}
    </M.Item>
  );
}
export const MenuSeparator = () => <M.Separator className="my-1 h-px bg-line" />;

export function CopyButton({ value, label = 'Copy', className }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <Tooltip content={copied ? 'Copied' : label}>
      <Button
        variant="ghost"
        size="icon-sm"
        className={className}
        aria-label={copied ? 'Copied' : label}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
          } catch {
            /* clipboard blocked; the value stays selectable */
          }
        }}
      >
        {copied ? <Check className="text-success" /> : <Copy />}
      </Button>
    </Tooltip>
  );
}

/** Truncated mono identifier (Cloudinary public ID, model, hash) with a copy button. */
export function MonoId({ value, className }: { value?: string; className?: string }) {
  if (!value) return <span className="text-ink-3">—</span>;
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1', className)}>
      <code className="truncate rounded bg-surface-alt px-1.5 py-0.5 font-mono text-xs text-ink-2" title={value}>
        {value}
      </code>
      <CopyButton value={value} label="Copy ID" className="size-7" />
    </span>
  );
}

export function Meter({ value, className, label }: { value: number; className?: string; label: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={cn('h-1 overflow-hidden rounded-full bg-sunken', className)}
    >
      <span className={cn('block h-full rounded-full', pct < 50 ? 'bg-warning' : 'bg-accent')} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-line bg-surface-alt px-1 font-mono text-[0.6875rem] text-ink-2">
      {children}
    </kbd>
  );
}

/** KPI number that counts up once when it enters view (skipped for reduced motion). */
// easeOutExpo-ish curve matching --ease-out; rAF + IntersectionObserver keep this dependency-free.
const easeOut = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));
const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function CountUp({ value, format = (n) => Math.round(n).toLocaleString('en-US'), className }: { value: number; format?: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? value : 0));
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      setShown(value);
      return;
    }
    let frame = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / 600);
        setShown(value * easeOut(t));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);
  return (
    <span ref={ref} className={cn('tabular', className)}>
      <span className="sr-only">{format(value)}</span>
      <span aria-hidden>{format(shown)}</span>
    </span>
  );
}

export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('mb-6 flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-1.5 text-label font-semibold tracking-[0.08em] text-ink-3 uppercase">{eyebrow}</div>}
        <h1 className="text-2xl leading-tight font-bold tracking-[-0.02em] max-sm:text-xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: ReactNode; icon?: ReactNode }>;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border border-line bg-surface p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'touch-target inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-meta font-medium text-ink-3 transition-colors hover:text-ink [&_svg]:size-4',
            value === o.value && 'bg-accent-soft text-accent hover:text-accent',
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}
