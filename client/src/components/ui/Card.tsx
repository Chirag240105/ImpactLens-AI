import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, interactive, ...rest }: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-line bg-surface',
        interactive &&
          'transition-[border-color,box-shadow] duration-[var(--dur-fast)] ease-brand hover:border-line-hover hover:shadow-sm',
        className,
      )}
      {...rest}
    />
  );
}

export function CardHeader({
  title,
  eyebrow,
  description,
  action,
  className,
  as: As = 'h2',
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  as?: 'h2' | 'h3';
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-5 pt-5 max-sm:px-4 max-sm:pt-4', className)}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-label font-semibold tracking-[0.08em] text-ink-3 uppercase">{eyebrow}</div>}
        <As className="text-[1.0625rem] leading-snug font-bold tracking-[-0.01em]">{title}</As>
        {description && <p className="mt-1 text-meta text-ink-3">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5 max-sm:p-4', className)} {...rest} />;
}
