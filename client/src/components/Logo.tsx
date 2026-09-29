import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8 shrink-0', className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <circle cx="16" cy="16" r="7.5" fill="none" stroke="var(--text-inverse)" strokeWidth="2.6" />
      <circle cx="16" cy="16" r="2.6" fill="var(--text-inverse)" />
    </svg>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      {!compact && (
        <span className="font-display text-lg font-extrabold tracking-[-0.04em] text-ink">
          impact<span className="font-medium text-ink-3">lens</span>
        </span>
      )}
    </span>
  );
}
