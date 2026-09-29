import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
type Size = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

const base =
  'touch-target inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--dur-fast)] ease-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-inverse shadow-xs hover:bg-accent-hover active:bg-accent-active',
  secondary: 'bg-surface text-ink border-line hover:bg-surface-hover hover:border-line-hover',
  ghost: 'bg-transparent text-ink-2 hover:bg-surface-hover hover:text-ink',
  danger: 'bg-surface text-error border-line hover:bg-error-soft hover:border-error',
  soft: 'bg-accent-soft text-accent hover:bg-accent-soft-hover',
};
const sizes: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-meta',
  md: 'h-9 px-3.5 text-meta',
  lg: 'h-11 px-4.5 text-sm',
  icon: 'size-9',
  'icon-sm': 'size-8',
};

export const buttonClass = (variant: Variant = 'secondary', size: Size = 'md', className?: string) =>
  cn(base, variants[variant], sizes[size], className);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  leftIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', isLoading, leftIcon, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass(variant, size, className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...rest}
    >
      {isLoading ? <Loader2 className="animate-spin" aria-hidden /> : leftIcon}
      {children}
    </button>
  );
});

export function ButtonLink({
  variant = 'secondary',
  size = 'md',
  className,
  leftIcon,
  children,
  ...rest
}: LinkProps & { variant?: Variant; size?: Size; leftIcon?: ReactNode }) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {leftIcon}
      {children}
    </Link>
  );
}
