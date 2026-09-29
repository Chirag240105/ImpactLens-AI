import type { ReactNode } from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { errorMessage } from '@/api/client';
import { Button } from './Button';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton rounded-md', className)} />;
}

export function Spinner({ label = 'Loading', className }: { label?: string; className?: string }) {
  return (
    <span role="status" className={cn('inline-flex items-center gap-2 text-meta text-ink-3', className)}>
      <Loader2 className="size-4 animate-spin" aria-hidden />
      <span>{label}…</span>
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'px-4 py-8' : 'px-6 py-14', className)}>
      {icon && (
        <div className="mb-3 grid size-10 place-items-center rounded-full bg-accent-soft text-accent [&_svg]:size-5" aria-hidden>
          {icon}
        </div>
      )}
      <h3 className="font-sans text-[0.9375rem] font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-meta text-ink-3">{description}</p>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function ErrorState({
  error,
  title = 'We couldn’t load this',
  onRetry,
  className,
  compact,
}: {
  error?: unknown;
  title?: ReactNode;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center justify-center text-center', compact ? 'px-4 py-8' : 'px-6 py-14', className)}
    >
      <div className="mb-3 grid size-10 place-items-center rounded-full bg-error-soft text-error" aria-hidden>
        <AlertTriangle className="size-5" />
      </div>
      <h3 className="font-sans text-[0.9375rem] font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-meta text-ink-3">{errorMessage(error, 'An unexpected error occurred.')}</p>
      {onRetry && (
        <Button className="mt-4" onClick={onRetry} leftIcon={<RefreshCw />}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function InlineAlert({
  tone = 'warning',
  title,
  children,
  icon,
  action,
  className,
}: {
  tone?: 'warning' | 'info' | 'error' | 'success';
  title?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const tones = {
    warning: 'bg-warning-soft text-warning',
    info: 'bg-info-soft text-info',
    error: 'bg-error-soft text-error',
    success: 'bg-success-soft text-success',
  } as const;
  return (
    <div className={cn('flex items-start gap-3 rounded-lg px-4 py-3', tones[tone], className)}>
      {icon && <span className="mt-0.5 shrink-0 [&_svg]:size-4" aria-hidden>{icon}</span>}
      <div className="min-w-0 flex-1 text-meta">
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className="text-ink-2">{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
