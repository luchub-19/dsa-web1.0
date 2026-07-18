import type { ElementType, HTMLAttributes, ReactNode } from 'react';

type CardTone = 'default' | 'signal' | 'success' | 'warning' | 'danger' | 'violet';

const TONE_CLASSES: Record<CardTone, string> = {
  default: 'border-border bg-surface',
  signal: 'border-signal/25 bg-signal/5',
  success: 'border-success/25 bg-success/5',
  warning: 'border-warning/25 bg-warning/5',
  danger: 'border-danger/25 bg-danger/5',
  violet: 'border-violet/25 bg-violet/5',
};

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  tone?: CardTone;
  as?: ElementType;
}

/**
 * The bordered, tinted surface every panel in StudyOS sits on. `tone`
 * only sets border/background — layout (padding, rounding overrides,
 * shadow) stays with the caller via `className` since panels differ a lot
 * in size (a stat tile vs. a full lesson card).
 */
export function Card({ children, tone = 'default', as: Comp = 'div', className = '', ...rest }: CardProps) {
  return (
    <Comp className={`rounded-xl border ${TONE_CLASSES[tone]} ${className}`} {...rest}>
      {children}
    </Comp>
  );
}
