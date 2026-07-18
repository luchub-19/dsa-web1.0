interface RetentionCurveProps {
  className?: string;
}

// R(t) = e^(-t / S): retention decays exponentially since the last review,
// where stability S grows with each successful review — the same shape
// lib/sm2.ts produces (interval_days growing with ease_factor each pass).
// Four review cycles, each spaced further apart with a shallower decay
// than the last. This is an illustrative model curve, not a plot of any
// specific user's card history.
const CURVE_PATH =
  'M 0.00 40.00 L 5.77 60.21 L 11.54 77.35 L 17.30 91.89 L 23.07 104.21 L 28.84 114.67 ' +
  'L 34.61 123.53 L 40.37 131.05 L 46.14 137.42 L 51.91 142.83 L 57.68 147.42 L 63.44 151.30 ' +
  'L 69.21 154.60 L 74.98 157.40 L 80.75 159.77 L 80.75 40.00 L 89.88 55.44 L 99.01 69.08 ' +
  'L 108.14 81.14 L 117.28 91.81 L 126.41 101.23 L 135.54 109.56 L 144.67 116.92 L 153.81 123.43 ' +
  'L 162.94 129.19 L 172.07 134.27 L 181.20 138.77 L 190.33 142.74 L 199.47 146.25 L 208.60 149.36 ' +
  'L 208.60 40.00 L 223.02 52.90 L 237.44 64.55 L 251.86 75.07 L 266.28 84.57 L 280.69 93.15 ' +
  'L 295.11 100.90 L 309.53 107.89 L 323.95 114.21 L 338.37 119.91 L 352.79 125.06 L 367.21 129.71 ' +
  'L 381.63 133.91 L 396.05 137.70 L 410.47 141.13 L 410.47 40.00 L 432.58 51.02 L 454.69 61.12 ' +
  'L 476.80 70.39 L 498.91 78.89 L 521.01 86.68 L 543.12 93.83 L 565.23 100.39 L 587.34 106.41 ' +
  'L 609.45 111.92 L 631.56 116.98 L 653.67 121.62 L 675.78 125.88 L 697.89 129.78 L 720.00 133.36';

const REVIEW_POINTS: [number, number][] = [
  [0, 40],
  [80.75, 40],
  [208.6, 40],
  [410.47, 40],
];

export default function RetentionCurve({ className = '' }: RetentionCurveProps) {
  return (
    <svg
      viewBox="0 0 720 260"
      className={className}
      role="img"
      aria-label="Đường cong ghi nhớ: mỗi lần ôn tập kéo mức ghi nhớ trở lại đỉnh, và khoảng cách tới lần ôn kế tiếp giãn dài dần"
    >
      <defs>
        <linearGradient id="curve-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-signal)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--color-signal)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Baseline / forgetting threshold */}
      <line x1="0" y1="230" x2="720" y2="230" stroke="var(--color-border)" strokeWidth="1" strokeDasharray="2 6" />

      {/* Area under the curve */}
      <path d={`${CURVE_PATH} L 720 230 L 0 230 Z`} fill="url(#curve-fill)" stroke="none" />

      {/* The curve itself */}
      <path
        d={CURVE_PATH}
        fill="none"
        stroke="var(--color-signal)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 2400,
          strokeDashoffset: 0,
          animation: 'drawCurve 1.6s ease-out both',
          ['--curve-length' as string]: 2400,
        }}
      />

      {/* Review markers — where a session pulled retention back to the top */}
      {REVIEW_POINTS.map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={i === REVIEW_POINTS.length - 1 ? 5 : 3.5}
          fill="var(--color-bg)"
          stroke="var(--color-success)"
          strokeWidth="2"
        />
      ))}
    </svg>
  );
}
