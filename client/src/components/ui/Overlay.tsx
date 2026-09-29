import type { ReactNode } from 'react';
import * as D from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

const overlayCls =
  'fixed inset-0 z-50 bg-scrim data-[state=open]:animate-[fade-in_var(--dur-base)_var(--ease-out)] data-[state=closed]:animate-[fade-out_var(--dur-fast)_var(--ease)]';

interface BaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/** Centered dialog for short tasks and confirmations (focus-trapped, Esc to close). */
export function Dialog({ open, onOpenChange, title, description, children, footer, className }: BaseProps) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className={overlayCls} />
        <D.Content
          {...(description ? {} : { 'aria-describedby': undefined })}
          className={cn(
            'fixed top-1/2 left-1/2 z-50 flex max-h-[min(90dvh,760px)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-line bg-surface shadow-lg focus:outline-none data-[state=open]:animate-[dialog-in_var(--dur-slow)_var(--ease-out)]',
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <D.Title className="font-display text-base font-bold">{title}</D.Title>
              {description && <D.Description className="mt-1 text-meta text-ink-3">{description}</D.Description>}
            </div>
            <D.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Close">
                <X />
              </Button>
            </D.Close>
          </div>
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>
          )}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

/** Right-side sheet for detail views; full screen on mobile. */
export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  headerExtra,
}: BaseProps & { headerExtra?: ReactNode }) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className={overlayCls} />
        <D.Content
          {...(description ? {} : { 'aria-describedby': undefined })}
          className={cn(
            'fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-line bg-surface shadow-lg focus:outline-none data-[state=open]:animate-[drawer-in_var(--dur-slow)_var(--ease-out)]',
            className,
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <D.Title className="truncate font-display text-base font-bold">{title}</D.Title>
              {description && <D.Description className="mt-0.5 text-meta text-ink-3">{description}</D.Description>}
            </div>
            <div className="flex items-center gap-1">
              {headerExtra}
              <D.Close asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Close panel">
                  <X />
                </Button>
              </D.Close>
            </div>
          </div>
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">{children}</div>
          {footer && <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">{footer}</div>}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  tone = 'danger',
  isLoading,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      className="max-w-md"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} isLoading={isLoading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
