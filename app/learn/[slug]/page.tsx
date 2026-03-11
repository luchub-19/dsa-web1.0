'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ChunkViewer from '../../../components/ChunkViewer';
import FeynmanInput from '../../../components/FeynmanInput';
import ActiveRecallBlock from '../../../components/ActiveRecallBlock';
import { useSpacedRepetition } from '../../../hooks/useSpacedRepetition';
import { getChapterBySlug } from '../../../data/curriculum';
import type { Chunk } from '../../../types/curriculum';
import type { SM2Grade } from '../../../types/spacedRepetition';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function scoreToGrade(score: number): SM2Grade {
  if (score === 100) return 5;
  if (score >= 80)   return 4;
  if (score >= 60)   return 3;
  if (score >= 40)   return 2;
  if (score >= 20)   return 1;
  return 0;
}

const GRADE_META: Record<
  SM2Grade,
  { label: string; sub: string; color: string; bg: string; border: string }
> = {
  5: { label: 'Hoàn hảo',       sub: 'Nhớ ngay, không do dự',   color: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/40' },
  4: { label: 'Tốt',            sub: 'Đúng, nhưng hơi chậm',    color: 'text-cyan-300',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/40'    },
  3: { label: 'Khó khăn',       sub: 'Nhớ ra nhưng mất công',   color: 'text-amber-300',   bg: 'bg-amber-500/10',   border: 'border-amber-500/40'   },
  2: { label: 'Lờ mờ',          sub: 'Sai, dễ hơn sau khi xem', color: 'text-orange-300',  bg: 'bg-orange-500/10',  border: 'border-orange-500/40'  },
  1: { label: 'Gần như quên',   sub: 'Sai và khó nhớ lại',      color: 'text-red-300',     bg: 'bg-red-500/10',     border: 'border-red-500/40'     },
  0: { label: 'Quên hoàn toàn', sub: 'Không nhớ gì cả',         color: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/40'    },
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ─── Step type ─────────────────────────────────────────────────────────────────

/** 1=theory  2=feynman  3=active-recall  4=srs-rating */
type Step = 1 | 2 | 3 | 4;

const STEP_LABELS: Record<Step, string> = {
  1: 'Lý thuyết',
  2: 'Feynman',
  3: 'Active Recall',
  4: 'Kết quả',
};

// ─── 404 screen ────────────────────────────────────────────────────────────────

function NotFoundScreen({ slug }: { slug: string }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
      <div className="text-center space-y-5 max-w-sm">
        <div className="text-5xl" aria-hidden="true">🔍</div>
        <h1 className="text-2xl font-bold text-slate-100">Không tìm thấy chương</h1>
        <p className="text-slate-400 font-mono text-sm">
          Slug <code className="text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded">{slug}</code>{' '}
          không tồn tại trong curriculum.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg
            border border-slate-700 bg-slate-800 hover:bg-slate-700
            text-slate-200 text-sm font-semibold transition-colors duration-150
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          ← Về trang chủ
        </Link>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function LearnPage() {
  const params  = useParams();
  const router  = useRouter();
  const slug    = typeof params.slug === 'string' ? params.slug : (params.slug?.[0] ?? '');

  // ── Resolve chapter ─────────────────────────────────────────────────────────
  const chapter = getChapterBySlug(slug);

  // ── Guard: unknown slug ─────────────────────────────────────────────────────
  if (!chapter) return <NotFoundScreen slug={slug} />;

  const CHUNKS     = chapter.data as Chunk[];
  const CHUNK_IDS  = CHUNKS.map((c) => c.id);
  const TOTAL      = CHUNKS.length;

  return <LessonPlayer
    key={slug}
    chunks={CHUNKS}
    chunkIds={CHUNK_IDS}
    total={TOTAL}
    title={chapter.title}
    slug={slug}
    router={router}
  />;
}

// ─── LessonPlayer (inner) ──────────────────────────────────────────────────────
// Extracted so the outer component can do the guard before hooks run.

interface LessonPlayerProps {
  chunks: Chunk[];
  chunkIds: string[];
  total: number;
  title: string;
  slug: string;
  router: ReturnType<typeof useRouter>;
}

function LessonPlayer({ chunks, chunkIds, total, title, slug, router }: LessonPlayerProps) {
  // ── Lesson state machine ───────────────────────────────────────────────────
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [step, setStep]                           = useState<Step>(1);
  const [done, setDone]                           = useState(false);

  // Step-4 ephemeral state
  const [pendingGrade, setPendingGrade]     = useState<SM2Grade | null>(null);
  const [gradeCommitted, setGradeCommitted] = useState(false);

  // ── Spaced repetition ──────────────────────────────────────────────────────
  const { seedChunks, recordReview, getCard, isLoading } = useSpacedRepetition();

  useEffect(() => {
    if (!isLoading) seedChunks(chunkIds);
  }, [isLoading, seedChunks, chunkIds]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const chunk       = chunks[currentChunkIndex];
  const isLastChunk = currentChunkIndex === total - 1;
  const committedCard = gradeCommitted ? getCard(chunk.id) : null;

  // ── Navigation ─────────────────────────────────────────────────────────────

  const goNextChunk = useCallback(() => {
    setPendingGrade(null);
    setGradeCommitted(false);
    setStep(1);
    if (isLastChunk) {
      setDone(true);
    } else {
      setCurrentChunkIndex((i) => i + 1);
    }
  }, [isLastChunk]);

  const handleFeynmanComplete = useCallback(() => {
    setStep(chunk.code_snippet ? 3 : 4);
  }, [chunk.code_snippet]);

  const handleRecallComplete = useCallback(() => {
    setStep(4);
  }, []);

  const handleCommitGrade = useCallback(
    (grade: SM2Grade) => {
      recordReview(chunk.id, grade);
      setGradeCommitted(true);
    },
    [chunk.id, recordReview]
  );

  // ── Finished screen ────────────────────────────────────────────────────────

  if (done) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
        <div className="text-center space-y-5 max-w-sm w-full">
          <div className="text-6xl" aria-hidden="true">🏆</div>
          <h2 className="text-2xl font-bold text-slate-100">Hoàn thành toàn bộ chương!</h2>
          <p className="text-slate-400 font-mono text-sm">{title}</p>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 text-left">
            <p className="font-mono text-[10px] uppercase tracking-widest text-slate-600 mb-3">
              Lịch ôn tập
            </p>
            <div className="space-y-1">
              {chunks.map((c) => {
                const card = getCard(c.id);
                return (
                  <div key={c.id} className="flex items-center justify-between gap-3 py-1.5
                    border-b border-slate-800/50 last:border-0">
                    <span className="font-mono text-xs text-slate-500 flex-shrink-0 w-14">{c.id}</span>
                    <span className="text-xs text-slate-400 truncate flex-1 min-w-0">{c.concept}</span>
                    <span className="font-mono text-xs text-indigo-300 flex-shrink-0 tabular-nums">
                      {card?.next_review_date ? formatDate(card.next_review_date) : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setCurrentChunkIndex(0); setStep(1); setDone(false); }}
              className="flex-1 px-4 py-2.5 rounded-lg border border-slate-700
                bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold
                transition-colors duration-150"
            >
              Học lại từ đầu
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="flex-1 px-4 py-2.5 rounded-lg border border-indigo-500/50
                bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-sm font-semibold
                transition-colors duration-150"
            >
              ← Trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main layout ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-25"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% -5%, rgba(99,102,241,0.18) 0%, transparent 65%)',
        }}
      />

      <div className="relative z-10 max-w-2xl mx-auto px-5 pt-10 pb-24">

        {/* Header */}
        <header className="mb-8 flex items-start justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-indigo-400/60">
              DSA / {slug}
            </p>
            <h1 className="text-base font-bold text-slate-200 mt-0.5">{title}</h1>
          </div>
          <Link
            href="/"
            className="font-mono text-xs text-slate-600 hover:text-slate-400
              transition-colors focus-visible:outline-none focus-visible:text-slate-300 mt-1"
          >
            ← Home
          </Link>
        </header>

        {/* Chunk progress */}
        <div className="mb-6 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5" aria-label="Tiến độ chunk">
              {chunks.map((c, i) => (
                <span
                  key={c.id}
                  className={[
                    'rounded-full transition-all duration-300',
                    i < currentChunkIndex
                      ? 'w-2 h-2 bg-indigo-400'
                      : i === currentChunkIndex
                      ? 'w-2.5 h-2.5 bg-indigo-500 ring-2 ring-indigo-500/30'
                      : 'w-2 h-2 bg-slate-700',
                  ].join(' ')}
                />
              ))}
            </div>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              {currentChunkIndex + 1} / {total}
            </span>
          </div>
          <div className="h-0.5 w-full bg-slate-800 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={currentChunkIndex + 1}
            aria-valuemin={1}
            aria-valuemax={total}
          >
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full
                transition-all duration-500 ease-out"
              style={{ width: `${((currentChunkIndex + 1) / total) * 100}%` }}
            />
          </div>
        </div>

        {/* Step tabs */}
        <div className="flex gap-1 mb-6" role="tablist" aria-label="Các bước học">
          {([1, 2, 3, 4] as Step[]).map((s) => (
            <div
              key={s}
              role="tab"
              aria-selected={step === s}
              className={[
                'flex-1 py-1.5 rounded text-center font-mono text-[10px]',
                'uppercase tracking-widest border select-none transition-colors duration-200',
                step === s
                  ? 'border-indigo-500/60 bg-indigo-500/10 text-indigo-300'
                  : step > s
                  ? 'border-slate-700/40 bg-slate-800/30 text-slate-600 line-through'
                  : 'border-slate-800 bg-transparent text-slate-700',
              ].join(' ')}
            >
              {s}. {STEP_LABELS[s]}
            </div>
          ))}
        </div>

        {/* Card */}
        <div
          key={`${chunk.id}-${step}`}
          className="rounded-xl border border-slate-800 bg-slate-900/70 backdrop-blur-sm
            p-7 shadow-2xl shadow-black/50 space-y-8"
          style={{ animation: 'fadeUp 0.25s ease-out both' }}
        >
          {/* Step 1: Theory */}
          {step >= 1 && (
            <section aria-label="Lý thuyết">
              <ChunkViewer chunk={chunk} total={total} index={currentChunkIndex} />
              {step === 1 && (
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setStep(chunk.feynman_prompt ? 2 : chunk.code_snippet ? 3 : 4)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg
                      bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold
                      border border-indigo-500 shadow-lg shadow-indigo-900/40
                      transition-all duration-150 active:scale-95
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                  >
                    Chuyển tiếp
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5"
                        strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              )}
            </section>
          )}

          {step >= 2 && <hr className="border-slate-800" aria-hidden="true" />}

          {/* Step 2: Feynman */}
          {step >= 2 && chunk.feynman_prompt && (
            <section aria-label="Feynman Technique">
              <FeynmanInput prompt={chunk.feynman_prompt} onComplete={handleFeynmanComplete} />
            </section>
          )}

          {step >= 3 && <hr className="border-slate-800" aria-hidden="true" />}

          {/* Step 3: Active Recall */}
          {step >= 3 && chunk.code_snippet && (
            <section aria-label="Active Recall">
              <ActiveRecallBlock codeSnippet={chunk.code_snippet} onComplete={handleRecallComplete} />
            </section>
          )}

          {step >= 4 && <hr className="border-slate-800" aria-hidden="true" />}

          {/* Step 4: SRS Self-rating */}
          {step === 4 && (
            <section aria-label="Đánh giá SRS và chuyển chunk">
              <p className="font-mono text-[10px] uppercase tracking-widest text-indigo-400/70 mb-1">
                SuperMemo-2 — Tự đánh giá
              </p>
              <p className="text-sm text-slate-300 leading-relaxed mb-5">
                Bạn nhớ khái niệm này ở mức độ nào?
              </p>

              {/* Grade picker */}
              {!gradeCommitted && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2"
                    role="group" aria-label="Chọn mức độ ghi nhớ (0–5)">
                    {([5, 4, 3, 2, 1, 0] as SM2Grade[]).map((g) => {
                      const m   = GRADE_META[g];
                      const sel = pendingGrade === g;
                      return (
                        <button key={g} type="button" onClick={() => setPendingGrade(g)}
                          aria-pressed={sel}
                          className={[
                            'flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-lg border',
                            'text-left transition-all duration-150 active:scale-95',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
                            sel
                              ? `${m.bg} ${m.border} ${m.color}`
                              : 'border-slate-700/60 bg-slate-800/40 text-slate-400 hover:border-slate-600',
                          ].join(' ')}
                        >
                          <span className={`font-mono text-xs font-bold ${sel ? m.color : 'text-slate-500'}`}>
                            {g}/5
                          </span>
                          <span className="text-xs font-semibold leading-tight">{m.label}</span>
                          <span className={`text-[10px] leading-tight ${sel ? '' : 'text-slate-600'}`}>
                            {m.sub}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <p className="text-xs text-slate-600 font-mono">
                      {pendingGrade === null ? 'Chọn một mức độ bên trên' : `${GRADE_META[pendingGrade].label} — ${pendingGrade * 20}%`}
                    </p>
                    <button
                      type="button"
                      disabled={pendingGrade === null}
                      onClick={() => { if (pendingGrade !== null) handleCommitGrade(pendingGrade); }}
                      className={[
                        'px-5 py-2 rounded-lg text-sm font-semibold border',
                        'transition-all duration-150 active:scale-95',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
                        pendingGrade === null
                          ? 'border-slate-700 text-slate-600 bg-slate-800/50 cursor-not-allowed'
                          : 'border-indigo-500 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40',
                      ].join(' ')}
                    >
                      Lưu điểm
                    </button>
                  </div>
                </>
              )}

              {/* After commit */}
              {gradeCommitted && pendingGrade !== null && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-5 py-4 space-y-1.5"
                    role="status" aria-live="polite">
                    <div className="flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <path d="M2.5 7l3 3 6-6" stroke="#34d399" strokeWidth="1.5"
                          strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="text-sm font-semibold text-emerald-300">
                        Đã lưu — SM-2: <span className="font-mono">{pendingGrade}/5</span>
                        <span className="ml-2 font-normal text-emerald-400/60">({pendingGrade * 20}%)</span>
                      </p>
                    </div>
                    {committedCard?.next_review_date && (
                      <p className="text-xs font-mono text-slate-400 pl-5">
                        Ôn tập tiếp:{' '}
                        <strong className="text-indigo-300">
                          {formatDate(committedCard.next_review_date)}
                        </strong>
                        <span className="text-slate-600 ml-2">
                          (sau {committedCard.interval_days} ngày · EF {committedCard.ease_factor.toFixed(2)})
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Next chunk / last chunk CTAs */}
                  {isLastChunk ? (
                    <div className="flex flex-col gap-3">
                      <button type="button" onClick={goNextChunk}
                        className="w-full inline-flex items-center justify-center gap-2
                          px-6 py-2.5 rounded-lg text-sm font-semibold border
                          bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500
                          shadow-lg shadow-indigo-900/40 transition-all duration-150 active:scale-95
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
                        Hoàn thành chương
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                          <path d="M7 2l5 5-5 5M2 7h10" stroke="currentColor" strokeWidth="1.5"
                            strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      {slug === 'linked-lists' || slug === 'pointers' || slug === 'element-ds' ? (
                        <button type="button"
                          onClick={() => router.push('/exam/pointers')}
                          className="w-full inline-flex items-center justify-center gap-3
                            px-6 py-4 rounded-xl text-base font-bold border
                            bg-red-600 hover:bg-red-500 text-white border-red-500
                            shadow-xl shadow-red-900/50 transition-all duration-150 active:scale-[0.98]
                            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                            <path d="M6 4l8 6-8 6V4z" fill="currentColor" />
                          </svg>
                          Vào Phòng Thi Thực Chiến (Code C++)
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8"
                              strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <button type="button" onClick={goNextChunk}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg
                          text-sm font-semibold border bg-indigo-600 hover:bg-indigo-500
                          text-white border-indigo-500 shadow-lg shadow-indigo-900/40
                          transition-all duration-150 active:scale-95
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
                        Chuyển sang bài tiếp theo
                        <span className="font-mono text-indigo-200/70 text-xs">
                          ({currentChunkIndex + 2}/{total})
                        </span>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                          <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5"
                            strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Dev skip */}
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={goNextChunk}
            className="text-xs font-mono text-slate-700 hover:text-slate-500 transition-colors">
            skip →
          </button>
        </div>

      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .theory-body p  { margin-bottom: 0.55rem; }
        .theory-body ul { list-style: disc; padding-left: 1.2rem; margin-bottom: 0.55rem; }
        .theory-body ol { list-style: decimal; padding-left: 1.2rem; margin-bottom: 0.55rem; }
        .theory-body li { margin-bottom: 0.25rem; font-size: 0.85rem; }
        .theory-body table { width: 100%; border-collapse: collapse; font-size: 0.82rem; margin-bottom: 0.75rem; }
        .theory-body th { text-align: left; font-weight: 600; color: #94a3b8; border-bottom: 1px solid rgba(148,163,184,0.15); padding: 0.4rem 0.6rem; }
        .theory-body td { color: #cbd5e1; border-bottom: 1px solid rgba(148,163,184,0.08); padding: 0.4rem 0.6rem; }
        .theory-body code {
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: 0.8em;
          background: rgba(99,102,241,0.13);
          color: #a5b4fc;
          padding: 0.1em 0.35em;
          border-radius: 3px;
        }
        .theory-body strong { color: #e2e8f0; font-weight: 600; }
        .theory-body em    { color: #94a3b8; font-style: italic; }
      `}</style>
    </div>
  );
}
