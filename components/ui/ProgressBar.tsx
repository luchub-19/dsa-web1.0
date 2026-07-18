type ProgressTone = 'signal' | 'success' | 'warning';

// Gradients are applied via inline CSS custom properties rather than
// Tailwind's `from-*/to-*` utilities: those class names are only picked up
// by Tailwind when they appear as literal strings in source, so a
// dynamically-chosen `from-${tone}` would silently fail to generate CSS.
const GRADIENTS: Record<ProgressTone, string> = {
  signal: 'linear-gradient(to right, var(--color-signal), var(--color-periwinkle))',
  success: 'linear-gradient(to right, var(--color-success), var(--color-signal))',
  warning: 'linear-gradient(to right, var(--color-warning), var(--color-success))',
};

interface ProgressBarProps {
  /** 0–100 */
  value: number;
  tone?: ProgressTone;
  label?: string;
  className?: string;
}

export function ProgressBar({ value, tone = 'signal', label, className = '' }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`h-0.5 w-full bg-border rounded-full overflow-hidden ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{ width: `${pct}%`, background: GRADIENTS[tone] }}
      />
    </div>
  );
}
