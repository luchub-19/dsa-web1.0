'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSpacedRepetition } from '../hooks/useSpacedRepetition';
import { todayISO } from '../lib/sm2';
import { dsaCurriculum } from '../data/curriculum';
import type { Chapter } from '../data/curriculum';

// ─── Animated counter ─────────────────────────────────────────────────────────

function AnimatedCount({ target, duration = 900 }: { target: number; duration?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (target === 0) { setDisplay(0); return; }
    const steps = 28;
    const step  = duration / steps;
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

// ─── Stat tile ────────────────────────────────────────────────────────────────

interface StatTileProps {
  label: string;
  value: number;
  suffix?: string;
  accent: string;
  bgAccent: string;
  borderAccent: string;
  delay?: string;
}

function StatTile({ label, value, suffix = '', accent, bgAccent, borderAccent, delay = '0s' }: StatTileProps) {
  return (
    <div
      className={`relative rounded-2xl border ${borderAccent} ${bgAccent} px-7 py-6 overflow-hidden`}
      style={{ animation: `fadeUp 0.5s ease-out ${delay} both` }}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500 mb-3">
        {label}
      </p>
      <p className={`text-5xl font-black tabular-nums leading-none ${accent}`}>
        <AnimatedCount target={value} />
        {suffix && <span className="text-2xl ml-1 font-mono">{suffix}</span>}
      </p>
    </div>
  );
}

// ─── Chapter card ─────────────────────────────────────────────────────────────

function ChapterCard({ chapter, index }: { chapter: Chapter; index: number }) {
  const delayMs = 300 + index * 60;
  const chunkCount = chapter.data.length;

  // Cycle through accent colours by index
  const accents = [
    { color: 'text-indigo-300', bg: 'bg-indigo-500/5',  border: 'border-indigo-500/20',  ring: 'hover:ring-indigo-500/40'  },
    { color: 'text-cyan-300',   bg: 'bg-cyan-500/5',    border: 'border-cyan-500/20',    ring: 'hover:ring-cyan-500/40'    },
    { color: 'text-violet-300', bg: 'bg-violet-500/5',  border: 'border-violet-500/20',  ring: 'hover:ring-violet-500/40'  },
    { color: 'text-emerald-300',bg: 'bg-emerald-500/5', border: 'border-emerald-500/20', ring: 'hover:ring-emerald-500/40' },
    { color: 'text-amber-300',  bg: 'bg-amber-500/5',   border: 'border-amber-500/20',   ring: 'hover:ring-amber-500/40'   },
    { color: 'text-rose-300',   bg: 'bg-rose-500/5',    border: 'border-rose-500/20',    ring: 'hover:ring-rose-500/40'    },
  ];
  const a = accents[index % accents.length];

  return (
    <Link
      href={`/learn/${chapter.slug}`}
      className="block focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950
        focus-visible:ring-indigo-400 rounded-xl"
      style={{ animation: `fadeUp 0.5s ease-out ${delayMs}ms both` }}
    >
      <div
        className={[
          'group relative rounded-xl border p-5 h-full',
          'transition-all duration-200 cursor-pointer',
          a.border, a.bg,
          `ring-1 ring-transparent ${a.ring}`,
          'hover:bg-slate-800/60',
        ].join(' ')}
      >
        {/* Header row */}
        <div className="flex items-start justify-between mb-4">
          <span className={`font-mono text-[9px] uppercase tracking-[0.2em]
            px-2 py-0.5 rounded-sm border border-current opacity-60 ${a.color}`}>
            {chunkCount} chunks
          </span>
          <svg
            width="14" height="14" viewBox="0 0 14 14" fill="none"
            className="text-slate-600 group-hover:text-slate-400 transition-colors mt-0.5"
            aria-hidden="true"
          >
            <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.4"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-slate-200 leading-snug">
          {chapter.title}
        </h3>
      </div>
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
    <div
      className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-900/50"
      style={{ fontFamily: "'DM Mono', 'Fira Code', 'JetBrains Mono', monospace" }}
    >
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-[0.07] bg-indigo-500" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-[0.05] bg-cyan-400" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-5 pt-14 pb-24">

        {/* Header */}
        <header className="mb-12" style={{ animation: 'fadeUp 0.4s ease-out both' }}>
          <p className="font-mono text-[10px] tracking-[0.35em] uppercase text-slate-600 mb-2">
            {today.split('-').reverse().join('/')} · {greeting}
          </p>
          <h1 className="text-3xl font-black tracking-tight text-slate-100 leading-tight">
            Study<span className="text-indigo-400">OS</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500 font-mono">
            Hệ thống học tập cá nhân · SuperMemo-2
          </p>
        </header>

        {/* Stats */}
        <section aria-label="Thống kê học tập" className="mb-6">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatTile
              label="Đã học"
              value={isLoading ? 0 : totalLearned}
              suffix="thẻ"
              accent="text-indigo-300"
              bgAccent="bg-indigo-500/5"
              borderAccent="border-indigo-500/15"
              delay="0.05s"
            />
            <StatTile
              label="Đến hạn hôm nay"
              value={isLoading ? 0 : dueCount}
              suffix="thẻ"
              accent={dueCount > 0 ? 'text-amber-300' : 'text-slate-500'}
              bgAccent={dueCount > 0 ? 'bg-amber-500/5' : 'bg-slate-800/30'}
              borderAccent={dueCount > 0 ? 'border-amber-500/20' : 'border-slate-700/30'}
              delay="0.12s"
            />
          </div>

          {/* Review CTA */}
          <div style={{ animation: 'fadeUp 0.5s ease-out 0.18s both' }}>
            <button
              type="button"
              onClick={() => router.push('/review')}
              disabled={dueCount === 0}
              className={[
                'w-full flex items-center justify-between px-6 py-4 rounded-xl border',
                'font-mono text-sm font-bold tracking-wide transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                'focus-visible:ring-offset-slate-950',
                dueCount > 0
                  ? [
                      'bg-amber-500/10 border-amber-500/30 text-amber-300',
                      'hover:bg-amber-500/15 hover:border-amber-400/40',
                      'active:scale-[0.99] focus-visible:ring-amber-400',
                      'shadow-lg shadow-amber-900/20',
                    ].join(' ')
                  : 'bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed',
              ].join(' ')}
            >
              <span className="flex items-center gap-3">
                <span className="text-lg" aria-hidden="true">
                  {dueCount > 0 ? '⚡' : '✓'}
                </span>
                <span>
                  {dueCount > 0
                    ? `Ôn tập ngay (Review) — ${dueCount} thẻ`
                    : 'Hôm nay không có gì để ôn'}
                </span>
              </span>
              {dueCount > 0 && (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </div>
        </section>

        {/* Divider */}
        <div
          className="flex items-center gap-4 my-8"
          style={{ animation: 'fadeUp 0.5s ease-out 0.22s both' }}
        >
          <div className="flex-1 h-px bg-slate-800" />
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-600">
            Chương học — DSA ({dsaCurriculum.length})
          </p>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        {/* Chapter grid — auto-generated from dsaCurriculum */}
        <section aria-label="Danh sách chương học">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {dsaCurriculum.map((chapter, index) => (
              <ChapterCard key={chapter.slug} chapter={chapter} index={index} />
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer
          className="mt-16 flex items-center justify-center gap-2"
          style={{ animation: 'fadeUp 0.5s ease-out 0.6s both' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 animate-pulse" aria-hidden="true" />
          <p className="font-mono text-[10px] text-slate-700 tracking-widest uppercase">
            StudyOS v0.2 · SM-2 Engine · {dsaCurriculum.reduce((a, c) => a + c.data.length, 0)} chunks
          </p>
        </footer>

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,400;0,500;1,400&display=swap');
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
