'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'success' | 'warning' | 'danger' | 'violet' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

// `primary` and `danger` are solid fills reserved for the one main action
// on screen (submit, confirm, the big irreversible action). Everything
// else is a quieter tinted-outline style so the solid buttons keep their
// weight as the thing your eye lands on first.
const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-signal border-signal text-bg hover:bg-signal/90 shadow-lg shadow-signal/20 focus-visible:ring-signal',
  danger:
    'bg-danger border-danger text-bg hover:bg-danger/90 shadow-lg shadow-danger/20 focus-visible:ring-danger',
  success:
    'bg-success/10 border-success/40 text-success hover:bg-success/15 focus-visible:ring-success',
  warning:
    'bg-warning/10 border-warning/40 text-warning hover:bg-warning/15 focus-visible:ring-warning',
  violet:
    'bg-violet/10 border-violet/40 text-violet hover:bg-violet/15 focus-visible:ring-violet',
  ghost:
    'bg-surface border-border text-ink hover:bg-surface-hover focus-visible:ring-signal',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-md',
  md: 'px-5 py-2.5 text-sm gap-2 rounded-lg',
  lg: 'px-6 py-3.5 text-base gap-3 rounded-xl',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={[
        'inline-flex items-center justify-center border font-semibold whitespace-nowrap',
        'transition-all duration-150 active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        SIZE_CLASSES[size],
        disabled
          ? 'bg-surface text-ink-faint border-border cursor-not-allowed opacity-60 active:scale-100'
          : VARIANT_CLASSES[variant],
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}
