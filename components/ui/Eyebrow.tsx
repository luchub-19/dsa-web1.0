import type { ReactNode } from 'react';

type EyebrowTone = 'default' | 'signal' | 'warning' | 'danger' | 'success' | 'violet';

const TONE_CLASSES: Record<EyebrowTone, string> = {
  default: 'text-ink-faint',
  signal: 'text-signal/70',
  warning: 'text-warning/70',
  danger: 'text-danger/70',
  success: 'text-success/70',
  violet: 'text-violet/70',
};

/**
 * Small mono, uppercase, letter-spaced label — the "system chrome" voice
 * used for section labels, timestamps and status text throughout StudyOS.
 * Centralises a pattern that was previously hand-typed (with drifting
 * tracking/size values) in every page.
 */
export function Eyebrow({
  children,
  tone = 'default',
  className = '',
}: {
  children: ReactNode;
  tone?: EyebrowTone;
  className?: string;
}) {
  return (
    <p className={`font-mono text-[10px] uppercase tracking-[0.25em] ${TONE_CLASSES[tone]} ${className}`}>
      {children}
    </p>
  );
}
