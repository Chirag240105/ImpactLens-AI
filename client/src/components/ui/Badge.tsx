import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type BadgeTone =
  | 'neutral'
  | 'accent'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'estimated'
  | 'observed'
  | 'inferred'
  | 'claimed';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-surface-alt text-ink-2',
  accent: 'bg-accent-soft text-accent',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  error: 'bg-error-soft text-error',
  info: 'bg-info-soft text-info',
  estimated: 'bg-warning-soft text-warning border-dashed border-current',
  observed: 'bg-observed-soft text-observed',
  inferred: 'bg-inferred-soft text-inferred',
  claimed: 'bg-claimed-soft text-claimed',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  icon?: ReactNode;
  dot?: boolean;
  pulse?: boolean;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { tone = 'neutral', icon, dot, pulse, className, children, ...rest },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex h-[1.375rem] max-w-full items-center gap-1.5 rounded-full border border-transparent px-2 text-label font-semibold whitespace-nowrap [&_svg]:size-3 [&_svg]:shrink-0',
        tones[tone],
        className,
      )}
      {...rest}
    >
      {dot && (
        <span aria-hidden className={cn('size-1.5 rounded-full bg-current', pulse && 'animate-pulse-dot')} />
      )}
      {icon}
      <span className="truncate">{children}</span>
    </span>
  );
});
