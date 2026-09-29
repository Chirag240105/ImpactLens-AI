import {
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const control =
  'w-full rounded-md border border-line bg-surface text-sm text-ink placeholder:text-ink-3 transition-[border-color,box-shadow] duration-[var(--dur-fast)] ease-brand hover:border-line-hover focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_rgba(var(--accent-rgb),0.16)] aria-[invalid=true]:border-error disabled:cursor-not-allowed disabled:bg-surface-alt disabled:text-ink-3';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cn(control, 'touch-target h-9 px-3', className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={cn(control, 'min-h-24 px-3 py-2 leading-relaxed', className)} {...rest} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...rest },
  ref,
) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(control, 'touch-target h-9 appearance-none pr-9 pl-3', className)} {...rest}>
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-3" />
    </div>
  );
});

/**
 * Labelled form field. Wires id, aria-invalid and aria-describedby onto its single control child
 * so every input has a real <label> and announces its hint or error.
 */
export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactElement<{ id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string; required?: boolean }>;
  className?: string;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': [hintId, errId].filter(Boolean).join(' ') || undefined,
        required,
      })
    : children;
  return (
    <div className={cn('grid gap-1.5', className)}>
      <label htmlFor={id} className="text-meta font-semibold text-ink">
        {label}
        {required && (
          <span className="ml-0.5 text-error" aria-hidden>
            *
          </span>
        )}
      </label>
      {control}
      {hint && !error && (
        <p id={hintId} className="text-meta text-ink-3">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} role="alert" className="text-meta font-medium text-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function Checkbox({ label, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={cn('touch-target inline-flex cursor-pointer items-center gap-2 text-sm text-ink-2', className)}>
      <input type="checkbox" className="size-4 rounded border-line accent-[var(--accent)]" {...rest} />
      {label}
    </label>
  );
}
