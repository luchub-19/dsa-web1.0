import type { SM2Grade } from '../../types/spacedRepetition';

export interface GradeStyle {
  label: string;
  color: string;
  bg: string;
  border: string;
}

/**
 * Shared SM-2 grade → label/color mapping.
 *
 * Previously this whole record (label + color + bg + border) was defined
 * twice, verbatim, in app/learn/[slug]/page.tsx and app/review/page.tsx.
 * Diffing both copies: `label`, `color`, `bg` and `border` were byte-
 * identical; only the short `sub` description differed between the two
 * screens (the learn page uses a slightly longer phrase, the review page a
 * terser one). That's a real, presumably intentional copy difference, so
 * `sub` is NOT included here — it stays local to each page. Only the part
 * that was pure duplication (and that this redesign already had to touch,
 * since the colors changed) moved into this single source of truth.
 */
export const GRADE_STYLE: Record<SM2Grade, GradeStyle> = {
  5: { label: 'Hoàn hảo', color: 'text-success', bg: 'bg-success/10', border: 'border-success/40' },
  4: { label: 'Tốt', color: 'text-signal', bg: 'bg-signal/10', border: 'border-signal/40' },
  3: { label: 'Khó khăn', color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/40' },
  2: { label: 'Lờ mờ', color: 'text-warning', bg: 'bg-warning/15', border: 'border-warning/55' },
  1: { label: 'Gần như quên', color: 'text-danger', bg: 'bg-danger/10', border: 'border-danger/40' },
  0: { label: 'Quên hoàn toàn', color: 'text-danger', bg: 'bg-danger/18', border: 'border-danger/55' },
};

/** dd/mm/yyyy, matching the two identical `formatDate` copies it replaces. */
export function formatVNDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
