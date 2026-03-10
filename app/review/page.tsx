'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ActiveRecallBlock from '../../components/ActiveRecallBlock';
import { useSpacedRepetition } from '../../hooks/useSpacedRepetition';
import type { SM2Grade } from '../../types/spacedRepetition';
import type { Chunk } from '../../types/curriculum';
import allChunksRaw from '../../data/linkedlists.json';

// ─── Data layer ────────────────────────────────────────────────────────────────

const ALL_CHUNKS = allChunksRaw as Chunk[];
const CHUNK_MAP  = new Map(ALL_CHUNKS.map((c) => [c.id, c]));

// ─── SM-2 grade metadata ───────────────────────────────────────────────────────

const GRADE_META: Record<
  SM2Grade,
  { label: string; sub: string; color: string; bg: string; border: string }
> = {
  5: { label: 'Hoàn hảo',       sub: 'Nhớ ngay',           color: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/40' },
  4: { label: 'Tốt',            sub: 'Đúng, hơi chậm',     color: 'text-cyan-300',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/40'    },
  3: { label: 'Khó khăn',       sub: 'Nhớ ra, mất công',   color: 'text-amber-300',   bg: 'bg-amber-500/10',   border: 'border-amber-500/40'   },
  2: { label: 'Lờ mờ',          sub: 'Sai, dễ hơn sau khi xem', color: 'text-orange-300', bg: 'bg-orange-500/10', border: 'border-orange-500/40' },
  1: { label: 'Gần như quên',   sub: 'Sai, khó nhớ lại',   color: 'text-red-300',     bg: 'bg-red-500/10',     border: 'border-red-500/40'     },
  0: { label: 'Quên hoàn toàn', sub: 'Không nhớ gì',       color: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/40'    },
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

/** Empty-queue screen */
function AllDoneScreen() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
      <div
        className="text-center space-y-5 max-w-sm"
        style={{ animation: 'fadeUp 0.4s ease-out both' }}
      >
        <div className="text-6xl" aria-hidden="true">🌿</div>
        <h2 className="text-2xl font-bold text-slate-100 tracking-tight">
          Tất cả đã ôn tập xong!
        </h2>
        <p className="text-slate-400 font-mono text-sm leading-relaxed">
          Bạn đã hoàn thành mọi mục tiêu ôn tập hôm nay.
          Nghỉ ngơi đi — hệ thống sẽ nhắc lại đúng lúc bạn sắp quên.
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

/** Chunk has no code_snippet — show a "read only" card with the concept */
function ReadOnlyCard({
  chunk,
  onDone,
}: {
  chunk: Chunk;
  onDone: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-700/60 bg-slate-900/80 p-5">
        <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-2">
          Lý thuyết
        </p>
        <div
          className="theory-inline text-sm text-slate-300 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: chunk.theory_html }}
        />
      </div>

      {chunk.active_recall_q && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <p className="text-[10px] font-mono text-amber-400/70 uppercase tracking-widest mb-1">
            Câu hỏi ôn tập
          </p>
          <p className="text-sm text-amber-100/80">{chunk.active_recall_q}</p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onDone}
          className="px-5 py-2 rounded-lg text-sm font-semibold border
            border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200
            transition-all duration-150 active:scale-95
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          Tiếp tục →
        </button>
      </div>
    </div>
  );
}

/** SM-2 self-rating panel shown after completing a card */
function GradePanel({
  onCommit,
}: {
  onCommit: (grade: SM2Grade) => void;
}) {
  const [pending, setPending] = useState<SM2Grade | null>(null);

  return (
    <div className="space-y-4" role="group" aria-label="Đánh giá mức độ ghi nhớ">
      <p className="text-[10px] font-mono text-indigo-400/70 uppercase tracking-widest">
        Bạn nhớ tốt tới đâu?
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {([5, 4, 3, 2, 1, 0] as SM2Grade[]).map((g) => {
          const m   = GRADE_META[g];
          const sel = pending === g;
          return (
            <button
              key={g}
              type="button"
              onClick={() => setPending(g)}
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

      <div className="flex justify-end">
        <button
          type="button"
          disabled={pending === null}
          onClick={() => pending !== null && onCommit(pending)}
          className={[
            'px-5 py-2 rounded-lg text-sm font-semibold border',
            'transition-all duration-150 active:scale-95',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
            pending === null
              ? 'border-slate-700 text-slate-600 bg-slate-800/50 cursor-not-allowed'
              : 'border-indigo-500 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40',
          ].join(' ')}
        >
          Lưu &amp; Tiếp →
        </button>
      </div>
    </div>
  );
}

// ─── Review phases ─────────────────────────────────────────────────────────────

type ReviewPhase = 'recall' | 'grading' | 'result';

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ReviewPage() {
  const { dueToday, recordReview, getCard, isLoading } = useSpacedRepetition();

  // Local queue — snapshot of dueToday at mount, never changes mid-session
  const [queue, setQueue] = useState<string[]>([]);
  const [queueReady, setQueueReady] = useState(false);

  useEffect(() => {
    if (!isLoading && !queueReady) {
      // Filter queue to IDs that actually exist in our data files
      const valid = dueToday.filter((id) => CHUNK_MAP.has(id));
      setQueue(valid);
      setQueueReady(true);
    }
  }, [isLoading, dueToday, queueReady]);

  const [queueIndex, setQueueIndex]   = useState(0);
  const [phase, setPhase]             = useState<ReviewPhase>('recall');
  const [lastGrade, setLastGrade]     = useState<SM2Grade | null>(null);
  const [sessionDone, setSessionDone] = useState(false);

  // ── Derived ──────────────────────────────────────────────────────────────
  const currentId    = queue[queueIndex] ?? null;
  const currentChunk = currentId ? (CHUNK_MAP.get(currentId) ?? null) : null;
  const totalDue     = queue.length;
  const progress     = queueIndex; // cards fully processed
  const committedCard = lastGrade !== null ? getCard(currentId ?? '') : null;

  // ── Handlers ─────────────────────────────────────────────────────────────

  /** Called by ActiveRecallBlock when all blanks are correctly filled. */
  const handleRecallComplete = useCallback(() => {
    setPhase('grading');
  }, []);

  /** Called by ReadOnlyCard (no blanks) — skip straight to grading. */
  const handleReadOnlyDone = useCallback(() => {
    setPhase('grading');
  }, []);

  /** Save SM-2 grade and show result briefly, then advance. */
  const handleCommitGrade = useCallback(
    (grade: SM2Grade) => {
      if (!currentId) return;
      recordReview(currentId, grade);
      setLastGrade(grade);
      setPhase('result');
    },
    [currentId, recordReview]
  );

  /** Advance to the next card in the queue. */
  const handleNext = useCallback(() => {
    setLastGrade(null);
    const nextIndex = queueIndex + 1;
    if (nextIndex >= queue.length) {
      setSessionDone(true);
    } else {
      setQueueIndex(nextIndex);
      setPhase('recall');
    }
  }, [queueIndex, queue.length]);

  // ── Loading ───────────────────────────────────────────────────────────────

  if (!queueReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="font-mono text-xs text-slate-600 animate-pulse">
          Đang tải dữ liệu ôn tập…
        </p>
      </div>
    );
  }

  // ── Empty queue ───────────────────────────────────────────────────────────

  if (queue.length === 0 || sessionDone) {
    return <AllDoneScreen />;
  }

  // ── Guard ─────────────────────────────────────────────────────────────────

  if (!currentChunk) {
    // ID exists in SM2 store but not in local data (stale reference)
    handleNext();
    return null;
  }

  const hasCode = Boolean(currentChunk.code_snippet);

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-20"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% -5%, rgba(245,158,11,0.2) 0%, transparent 65%)',
        }}
      />

      <div className="relative z-10 max-w-2xl mx-auto px-5 pt-10 pb-24">

        {/* ── Header ────────────────────────────────────────────────── */}
        <header
          className="flex items-center justify-between mb-8"
          style={{ animation: 'fadeUp 0.3s ease-out both' }}
        >
          <div>
            <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-amber-400/60">
              Ôn tập
            </p>
            <h1 className="text-base font-bold text-slate-200">Review Queue</h1>
          </div>
          <Link
            href="/"
            className="font-mono text-xs text-slate-600 hover:text-slate-400
              transition-colors focus-visible:outline-none focus-visible:text-slate-300"
          >
            ← Home
          </Link>
        </header>

        {/* ── Queue progress ─────────────────────────────────────────── */}
        <div
          className="mb-7 space-y-2"
          style={{ animation: 'fadeUp 0.3s ease-out 0.05s both' }}
        >
          <div className="flex items-center justify-between">
            {/* Mini card dots */}
            <div className="flex items-center gap-1.5" aria-label="Tiến độ queue">
              {queue.map((id, i) => (
                <span
                  key={id}
                  className={[
                    'rounded-full transition-all duration-300',
                    i < queueIndex
                      ? 'w-2 h-2 bg-emerald-500'
                      : i === queueIndex
                      ? 'w-2.5 h-2.5 bg-amber-400 ring-2 ring-amber-400/30'
                      : 'w-2 h-2 bg-slate-700',
                  ].join(' ')}
                />
              ))}
            </div>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              {queueIndex + 1} / {totalDue}
            </span>
          </div>

          <div
            className="h-0.5 w-full bg-slate-800 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={queueIndex + 1}
            aria-valuemin={1}
            aria-valuemax={totalDue}
          >
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full
                transition-all duration-500 ease-out"
              style={{ width: `${((queueIndex + 1) / totalDue) * 100}%` }}
            />
          </div>
        </div>

        {/* ── Card ─────────────────────────────────────────────────── */}
        <div
          key={`${currentId}-${phase}`}
          className="rounded-xl border border-slate-800 bg-slate-900/70 backdrop-blur-sm
            p-7 shadow-2xl shadow-black/50 space-y-6"
          style={{ animation: 'fadeUp 0.25s ease-out both' }}
        >
          {/* Card header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="font-mono text-[10px] text-slate-600 tracking-widest uppercase">
                {currentChunk.id}
              </span>
              <h2 className="text-lg font-bold text-slate-100 leading-snug mt-0.5">
                {currentChunk.concept}
              </h2>
            </div>
            <span className="flex-shrink-0 font-mono text-[10px] px-2 py-0.5 rounded-sm
              border border-amber-500/30 text-amber-400/70 bg-amber-500/5">
              ôn tập
            </span>
          </div>

          <hr className="border-slate-800" aria-hidden="true" />

          {/* ── Phase: recall ─────────────────────────────────────── */}
          {phase === 'recall' && (
            <>
              {hasCode ? (
                <ActiveRecallBlock
                  codeSnippet={currentChunk.code_snippet!}
                  onComplete={handleRecallComplete}
                />
              ) : (
                <ReadOnlyCard
                  chunk={currentChunk}
                  onDone={handleReadOnlyDone}
                />
              )}
            </>
          )}

          {/* ── Phase: grading ────────────────────────────────────── */}
          {phase === 'grading' && (
            <>
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5
                px-4 py-3 flex items-center gap-3">
                <span className="text-lg" aria-hidden="true">✓</span>
                <p className="text-sm text-emerald-300 font-semibold">
                  Hoàn thành! Đánh giá mức độ ghi nhớ của bạn.
                </p>
              </div>
              <GradePanel onCommit={handleCommitGrade} />
            </>
          )}

          {/* ── Phase: result ─────────────────────────────────────── */}
          {phase === 'result' && lastGrade !== null && (
            <div className="space-y-4">
              {/* Grade confirmation */}
              <div
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/5
                  px-5 py-4 space-y-1.5"
                role="status"
                aria-live="polite"
              >
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M2.5 7l3 3 6-6" stroke="#34d399" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-sm font-semibold text-emerald-300">
                    Đã lưu — SM-2:{' '}
                    <span className="font-mono">{lastGrade}/5</span>
                    <span className="ml-2 font-normal text-emerald-400/60">
                      · {GRADE_META[lastGrade].label}
                    </span>
                  </p>
                </div>

                {committedCard?.next_review_date && (
                  <p className="text-xs font-mono text-slate-400 pl-5">
                    Ôn tiếp:{' '}
                    <strong className="text-indigo-300">
                      {formatDate(committedCard.next_review_date)}
                    </strong>
                    <span className="text-slate-600 ml-2">
                      (sau {committedCard.interval_days} ngày · EF{' '}
                      {committedCard.ease_factor.toFixed(2)})
                    </span>
                  </p>
                )}
              </div>

              {/* Remaining in queue */}
              {queueIndex + 1 < totalDue && (
                <p className="text-xs text-slate-600 font-mono text-right">
                  Còn {totalDue - queueIndex - 1} thẻ trong hàng đợi
                </p>
              )}

              {/* Next button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg
                    text-sm font-semibold border transition-all duration-150 active:scale-95
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400
                    bg-amber-500/10 hover:bg-amber-500/15 text-amber-300
                    border-amber-500/30 hover:border-amber-400/40"
                >
                  {queueIndex + 1 >= totalDue ? (
                    <>Hoàn thành phiên ôn tập 🎉</>
                  ) : (
                    <>
                      Thẻ tiếp theo
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5"
                          strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .theory-inline p  { margin-bottom: 0.5rem; }
        .theory-inline ul { list-style: disc; padding-left: 1.2rem; margin-bottom: 0.5rem; }
        .theory-inline li { margin-bottom: 0.25rem; }
        .theory-inline code {
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: 0.8em;
          background: rgba(99,102,241,0.13);
          color: #a5b4fc;
          padding: 0.1em 0.35em;
          border-radius: 3px;
        }
        .theory-inline strong { color: #e2e8f0; }
      `}</style>
    </div>
  );
}
