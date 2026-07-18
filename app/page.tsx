'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSpacedRepetition } from '../hooks/useSpacedRepetition';
import { todayISO } from '../lib/sm2';
import { dsaCurriculum } from '../data/curriculum';
import type { Chapter } from '../data/curriculum';
import { Eyebrow } from '../components/ui/Eyebrow';
import { Card } from '../components/ui/Card';
import RetentionCurve from '../components/RetentionCurve';

// ─── Animated counter ─────────────────────────────────────────────────────────

function AnimatedCount({ target, duration = 900 }: { target: number; duration?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (target === 0) { setDisplay(0); return; }
    const steps = 28;
    const step = duration / steps;
    let current = 0;
    const id = setInterval(() => {
      current++;
      setDisplay(Math.round((current / steps) * target));
      if (current >= steps) { clearInterval(id); setDisplay(target); }
    }, step);
    return () => clearInterval(id);
  }, [target, duration]);

  return <>{display}</>;
}

// ─── Chapter card ─────────────────────────────────────────────────────────────
//
// Six-color rotation, same idea as before but re-mapped onto the StudyOS
// token set instead of raw Tailwind swatches.

const CHAPTER_ACCENTS = [
  { text: 'text-signal', bg: 'bg-signal/5', border: 'border-signal/20', ring: 'hover:ring-signal/40' },
  { text: 'text-periwinkle', bg: 'bg-periwinkle/5', border: 'border-periwinkle/20', ring: 'hover:ring-periwinkle/40' },
  { text: 'text-violet', bg: 'bg-violet/5', border: 'border-violet/20', ring: 'hover:ring-violet/40' },
  { text: 'text-success', bg: 'bg-success/5', border: 'border-success/20', ring: 'hover:ring-success/40' },
  { text: 'text-warning', bg: 'bg-warning/5', border: 'border-warning/20', ring: 'hover:ring-warning/40' },
  { text: 'text-danger', bg: 'bg-danger/5', border: 'border-danger/20', ring: 'hover:ring-danger/40' },
];

function ChapterCard({ chapter, index }: { chapter: Chapter; index: number }) {
  const delayMs = 300 + index * 50;
  const chunkCount = chapter.data.length;
  const a = CHAPTER_ACCENTS[index % CHAPTER_ACCENTS.length];

  return (
    <Link
      href={`/learn/${chapter.slug}`}
      className="block focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-offset-2 focus-visible:ring-offset-bg
        focus-visible:ring-signal rounded-xl"
      style={{ animation: `fadeUp 0.5s ease-out ${delayMs}ms both` }}
    >
      <Card
        tone="default"
        className={[
          'group relative p-5 h-full cursor-pointer',
          'transition-all duration-200',
          a.border, a.bg,
          `ring-1 ring-transparent ${a.ring}`,
          'hover:bg-surface-hover',
        ].join(' ')}
      >
        <div className="flex items-start justify-between mb-4">
          <span className={`font-mono text-[9px] uppercase tracking-[0.2em]
            px-2 py-0.5 rounded-sm border border-current opacity-60 ${a.text}`}>
            {chunkCount} chunks
          </span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
            className="text-ink-faint group-hover:text-ink-dim transition-colors mt-0.5" aria-hidden="true">
            <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.4"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="text-sm font-bold text-ink leading-snug">{chapter.title}</h3>
      </Card>
    </Link>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { allCards, dueToday, isLoading } = useSpacedRepetition();
  const today = useMemo(() => todayISO(), []);

  const totalLearned = useMemo(
    () => Object.values(allCards).filter((c) => c.total_reviews > 0).length,
    [allCards]
  );
  const dueCount = dueToday.length;

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Chào buổi sáng';
    if (h < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  }, []);

  return (
    <div className="min-h-screen bg-bg text-ink selection:bg-signal/30">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-[0.08] bg-signal" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-[0.06] bg-violet" />
        <div className="absolute inset-0 opacity-[0.03] grid-texture" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-5 pt-14 pb-24">

        {/* Header */}
        <header className="mb-8" style={{ animation: 'fadeUp 0.4s ease-out both' }}>
          <Eyebrow className="mb-2">
            {today.split('-').reverse().join('/')} · {greeting}
          </Eyebrow>
          <h1 className="font-mono text-3xl font-bold tracking-tight text-ink leading-tight">
            Study<span className="text-signal">OS</span>
          </h1>
          <p className="mt-1 text-sm text-ink-dim">
            Hệ thống học tập cá nhân · SuperMemo-2
          </p>
        </header>

        {/* Memory panel: retention curve + live stats + CTA in one hero */}
        <section aria-label="Trạng thái ghi nhớ" style={{ animation: 'fadeUp 0.5s ease-out 0.08s both' }}>
          <Card className="p-6 sm:p-7 overflow-hidden">
            <Eyebrow tone="signal">Đường cong ghi nhớ · SuperMemo-2</Eyebrow>
            <p className="mt-1.5 text-xs text-ink-faint max-w-md leading-relaxed">
              Mỗi lần ôn tập kéo mức ghi nhớ trở lại đỉnh — và khoảng cách tới lần ôn kế tiếp giãn dài dần.
            </p>

            <RetentionCurve className="w-full h-auto mt-4 -mx-1" />

            <div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_auto] gap-4 sm:gap-6 mt-2 pt-5 border-t border-border items-end">
              <div>
                <p className="font-mono text-3xl sm:text-4xl font-bold text-ink tabular-nums leading-none">
                  {isLoading ? 0 : <AnimatedCount target={totalLearned} />}
                </p>
                <Eyebrow className="mt-2">Đã học</Eyebrow>
              </div>

              <div>
                <p className={`font-mono text-3xl sm:text-4xl font-bold tabular-nums leading-none ${
                  dueCount > 0 ? 'text-warning' : 'text-ink-faint'
                }`}>
                  {isLoading ? 0 : <AnimatedCount target={dueCount} />}
                </p>
                <Eyebrow tone={dueCount > 0 ? 'warning' : 'default'} className="mt-2">
                  Đến hạn hôm nay
                </Eyebrow>
              </div>

              <button
                type="button"
                onClick={() => router.push('/review')}
                disabled={dueCount === 0}
                className={[
                  'col-span-2 sm:col-span-1 flex items-center justify-between gap-3 px-5 py-3.5 rounded-lg border',
                  'font-mono text-sm font-bold tracking-wide transition-all duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                  'focus-visible:ring-offset-bg',
                  dueCount > 0
                    ? [
                        'bg-warning/10 border-warning/30 text-warning',
                        'hover:bg-warning/15 hover:border-warning/40',
                        'active:scale-[0.99] focus-visible:ring-warning',
                        'shadow-lg shadow-warning/10',
                      ].join(' ')
                    : 'bg-surface-2 border-border text-ink-faint cursor-not-allowed',
                ].join(' ')}
              >
                <span className="flex items-center gap-2.5">
                  <span aria-hidden="true">{dueCount > 0 ? '⚡' : '✓'}</span>
                  <span>{dueCount > 0 ? `Ôn tập ngay — ${dueCount} thẻ` : 'Không có gì để ôn'}</span>
                </span>
                {dueCount > 0 && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </div>
          </Card>
        </section>

        {/* Divider */}
        <div className="flex items-center gap-4 my-8" style={{ animation: 'fadeUp 0.5s ease-out 0.16s both' }}>
          <div className="flex-1 h-px bg-border" />
          <Eyebrow>Chương học — DSA ({dsaCurriculum.length})</Eyebrow>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Chapter grid */}
        <section aria-label="Danh sách chương học">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {dsaCurriculum.map((chapter, index) => (
              <ChapterCard key={chapter.slug} chapter={chapter} index={index} />
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-16 flex items-center justify-center gap-2"
          style={{ animation: 'fadeUp 0.5s ease-out 0.6s both' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-success/60 animate-pulse" aria-hidden="true" />
          <p className="font-mono text-[10px] text-ink-faint tracking-widest uppercase">
            StudyOS v0.2 · SM-2 Engine · {dsaCurriculum.reduce((a, c) => a + c.data.length, 0)} chunks
          </p>
        </footer>

      </div>
    </div>
  );
}
