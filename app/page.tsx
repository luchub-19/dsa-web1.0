'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSpacedRepetition } from '../hooks/useSpacedRepetition';
import { todayISO } from '../lib/sm2';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SubjectCard {
  id: string;
  title: string;
  subtitle: string;
  href: string | null;      // null = coming soon
  icon: string;
  accentColor: string;      // Tailwind text color
  ringColor: string;        // Tailwind ring color for hover
  borderColor: string;
  tag: string;
}

// ─── Subject registry ──────────────────────────────────────────────────────────

const SUBJECTS: SubjectCard[] = [
  {
    id: 'dsa',
    title: 'Cấu trúc Dữ liệu & Giải thuật',
    subtitle: 'Linked Lists · Pointers · Trees · Graphs',
    href: '/learn/pointers',
    icon: '⬡',
    accentColor: 'text-indigo-300',
    ringColor: 'hover:ring-indigo-500/40',
    borderColor: 'border-indigo-500/20',
    tag: 'Active',
  },
  {
    id: 'discrete',
    title: 'Toán Rời Rạc & Tổ Hợp',
    subtitle: 'Graph Theory · Combinatorics · Logic',
    href: null,
    icon: '∑',
    accentColor: 'text-violet-300',
    ringColor: 'hover:ring-violet-500/30',
    borderColor: 'border-violet-500/10',
    tag: 'Soon',
  },
  {
    id: 'physics',
    title: 'Vật Lý Đại Cương',
    subtitle: 'Cơ học · Điện từ · Quang học',
    href: null,
    icon: 'φ',
    accentColor: 'text-cyan-300',
    ringColor: 'hover:ring-cyan-500/30',
    borderColor: 'border-cyan-500/10',
    tag: 'Soon',
  },
  {
    id: 'law',
    title: 'Pháp Luật Đại Cương',
    subtitle: 'Hiến pháp · Dân sự · Hành chính',
    href: null,
    icon: '§',
    accentColor: 'text-amber-300',
    ringColor: 'hover:ring-amber-500/30',
    borderColor: 'border-amber-500/10',
    tag: 'Soon',
  },
];

// ─── Animated counter ─────────────────────────────────────────────────────────

function AnimatedCount({ target, duration = 900 }: { target: number; duration?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (target === 0) { setDisplay(0); return; }
    const steps  = 28;
    const step   = duration / steps;
    let current  = 0;
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
  accent: string;       // Tailwind text class
  bgAccent: string;     // Tailwind bg class
  borderAccent: string;
  delay?: string;       // animation-delay value
}

function StatTile({ label, value, suffix = '', accent, bgAccent, borderAccent, delay = '0s' }: StatTileProps) {
  return (
    <div
      className={`relative rounded-2xl border ${borderAccent} ${bgAccent} px-7 py-6 overflow-hidden`}
      style={{ animation: `fadeUp 0.5s ease-out ${delay} both` }}
    >
      {/* Decorative corner glow */}
      <div
        className="pointer-events-none absolute -top-8 -right-8 w-28 h-28 rounded-full blur-2xl opacity-20"
        style={{ background: 'currentColor' }}
        aria-hidden="true"
      />
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

// ─── Subject card ─────────────────────────────────────────────────────────────

function SubjectCardItem({
  subject,
  index,
}: {
  subject: SubjectCard;
  index: number;
}) {
  const isActive  = subject.href !== null;
  const delayMs   = 300 + index * 80;

  const inner = (
    <div
      className={[
        'group relative rounded-xl border p-5 h-full',
        'transition-all duration-200',
        subject.borderColor,
        isActive
          ? `bg-slate-900/60 hover:bg-slate-800/70 cursor-pointer ring-1 ring-transparent ${subject.ringColor}`
          : 'bg-slate-900/30 cursor-not-allowed opacity-50',
      ].join(' ')}
      style={{ animation: `fadeUp 0.5s ease-out ${delayMs}ms both` }}
    >
      {/* Tag */}
      <div className="flex items-start justify-between mb-4">
        <span
          className={[
            'font-mono text-[9px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-sm border',
            isActive
              ? `${subject.accentColor} border-current opacity-70`
              : 'text-slate-600 border-slate-700',
          ].join(' ')}
        >
          {subject.tag}
        </span>
        {isActive && (
          <svg
            width="14" height="14" viewBox="0 0 14 14" fill="none"
            className="text-slate-600 group-hover:text-slate-400 transition-colors"
            aria-hidden="true"
          >
            <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.4"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* Icon */}
      <p className={`text-3xl font-black mb-3 leading-none ${subject.accentColor}`}>
        {subject.icon}
      </p>

      {/* Text */}
      <h3 className="text-sm font-bold text-slate-200 leading-snug mb-1.5">
        {subject.title}
      </h3>
      <p className="text-xs text-slate-500 leading-relaxed font-mono">
        {subject.subtitle}
      </p>
    </div>
  );

  if (isActive) {
    return (
      <Link href={subject.href!} className="block h-full focus-visible:outline-none
        focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950
        focus-visible:ring-indigo-400 rounded-xl">
        {inner}
      </Link>
    );
  }
  return <div aria-disabled="true">{inner}</div>;
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { allCards, dueToday, isLoading } = useSpacedRepetition();
  const today = useMemo(() => todayISO(), []);

  // Derived stats
  const totalLearned = useMemo(
    () => Object.values(allCards).filter((c) => c.total_reviews > 0).length,
    [allCards]
  );
  const dueCount = dueToday.length;

  // Greeting based on time of day
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
      {/* ── Background texture ───────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
        {/* Radial glows */}
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-[0.07]
          bg-indigo-500" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-[0.05]
          bg-cyan-400" />
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-5 pt-14 pb-24">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <header
          className="mb-12"
          style={{ animation: 'fadeUp 0.4s ease-out both' }}
        >
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

        {/* ── Hero stats ───────────────────────────────────────────────── */}
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
              aria-label={
                dueCount > 0
                  ? `Ôn tập ngay — ${dueCount} thẻ đến hạn`
                  : 'Không có thẻ nào đến hạn hôm nay'
              }
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

        {/* ── Divider ──────────────────────────────────────────────────── */}
        <div
          className="flex items-center gap-4 my-8"
          style={{ animation: 'fadeUp 0.5s ease-out 0.22s both' }}
        >
          <div className="flex-1 h-px bg-slate-800" />
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-600">
            Môn học
          </p>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        {/* ── Subject grid ─────────────────────────────────────────────── */}
        <section aria-label="Danh sách môn học">
          <div className="grid grid-cols-2 gap-3">
            {SUBJECTS.map((subject, i) => (
              <SubjectCardItem key={subject.id} subject={subject} index={i} />
            ))}
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <footer
          className="mt-16 flex items-center justify-center gap-2"
          style={{ animation: 'fadeUp 0.5s ease-out 0.55s both' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 animate-pulse"
            aria-hidden="true" />
          <p className="font-mono text-[10px] text-slate-700 tracking-widest uppercase">
            StudyOS v0.1 · SM-2 Engine
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
