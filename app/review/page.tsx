'use client';

import { useCallback, useEffect, useReducer, useState } from 'react';
import Link from 'next/link';
import ActiveRecallBlock from '../../components/ActiveRecallBlock';
import { useSpacedRepetition } from '../../hooks/useSpacedRepetition';
import type { SM2Grade } from '../../types/spacedRepetition';
import type { Chunk } from '../../types/curriculum';
import { normalizeChunks } from '../../types/curriculum';
import { sanitizeHtml } from '../../lib/sanitizeHtml';
import { dsaCurriculum } from '../../data/curriculum';
import { GRADE_STYLE, formatVNDate } from '../../lib/theme/grades';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { ProgressBar } from '../../components/ui/ProgressBar';

// ─── Data layer ────────────────────────────────────────────────────────────────
//
// FIX QUAN TRỌNG: bản gốc chỉ `import allChunksRaw from '../../data/linkedlists.json'`
// — nghĩa là CHUNK_MAP chỉ chứa chunk của đúng 1 chương (Linked Lists). Học
// sinh học xong bất kỳ chương nào khác (ví dụ "Sắp xếp", "Cây nhị phân") sẽ
// có thẻ SM-2 được `seedChunks()` ghi vào localStorage và tính là "đến hạn"
// (dueToday), nhưng khi vào trang /review, dòng
// `dueToday.filter((id) => CHUNK_MAP.has(id))` sẽ ÂM THẦM LOẠI BỎ toàn bộ
// thẻ đó vì CHUNK_MAP không hề biết tới chúng — thẻ biến mất khỏi hàng đợi
// ôn tập, không có thông báo lỗi nào. Học sinh sẽ tưởng "không có gì để ôn"
// trong khi thực ra có, chỉ là bị lọc nhầm.
//
// SỬA: build CHUNK_MAP từ TẤT CẢ 15 chương trong dsaCurriculum, chuẩn hóa
// qua normalizeChunks() để xử lý đồng thời cả 2 schema (xem types/curriculum.ts).

const ALL_CHUNKS: Chunk[] = dsaCurriculum.flatMap((chapter) =>
  normalizeChunks(chapter.data)
);
const CHUNK_MAP = new Map(ALL_CHUNKS.map((c) => [c.id, c]));

// `sub` stays local — see lib/theme/grades.ts for why it isn't merged in.
const GRADE_SUB: Record<SM2Grade, string> = {
  5: 'Nhớ ngay',
  4: 'Đúng, hơi chậm',
  3: 'Nhớ ra, mất công',
  2: 'Sai, dễ hơn sau khi xem',
  1: 'Sai, khó nhớ lại',
  0: 'Không nhớ gì',
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function AllDoneScreen() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-6">
      <div
        className="text-center space-y-5 max-w-sm"
        style={{ animation: 'fadeUp 0.4s ease-out both' }}
      >
        <div className="text-6xl" aria-hidden="true">🌿</div>
        <h2 className="text-2xl font-bold text-ink tracking-tight">
          Tất cả đã ôn tập xong!
        </h2>
        <p className="text-ink-dim font-mono text-sm leading-relaxed">
          Bạn đã hoàn thành mọi mục tiêu ôn tập hôm nay.
          Nghỉ ngơi đi — hệ thống sẽ nhắc lại đúng lúc bạn sắp quên.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg
            border border-border-strong bg-surface hover:bg-surface-hover
            text-ink text-sm font-semibold transition-colors duration-150
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        >
          ← Về trang chủ
        </Link>
      </div>
    </div>
  );
}

function ReadOnlyCard({
  chunk,
  onDone,
}: {
  chunk: Chunk;
  onDone: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-surface-2/80 p-5">
        <Eyebrow className="mb-2">Lý thuyết</Eyebrow>
        {chunk.theoryFormat === 'html' ? (
          <div
            className="prose-content text-sm text-ink-dim leading-relaxed"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(chunk.theory) }}
          />
        ) : (
          <div className="prose-content text-sm text-ink-dim leading-relaxed whitespace-pre-wrap">
            {chunk.theory}
          </div>
        )}
      </div>

      {chunk.active_recall_q && (
        <div className="rounded-lg border border-warning/20 bg-warning/5 px-4 py-3">
          <p className="text-[10px] font-mono text-warning/70 uppercase tracking-widest mb-1">
            Câu hỏi ôn tập
          </p>
          <p className="text-sm text-warning/80">{chunk.active_recall_q}</p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onDone}
          className="px-5 py-2 rounded-lg text-sm font-semibold border
            border-border-strong bg-surface hover:bg-surface-hover text-ink
            transition-all duration-150 active:scale-95
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        >
          Tiếp tục →
        </button>
      </div>
    </div>
  );
}

function GradePanel({
  onCommit,
}: {
  onCommit: (grade: SM2Grade) => void;
}) {
  const [pending, setPending] = useState<SM2Grade | null>(null);

  return (
    <div className="space-y-4" role="group" aria-label="Đánh giá mức độ ghi nhớ">
      <Eyebrow tone="warning">Bạn nhớ tốt tới đâu?</Eyebrow>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {([5, 4, 3, 2, 1, 0] as SM2Grade[]).map((g) => {
          const m = GRADE_STYLE[g];
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
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning',
                sel
                  ? `${m.bg} ${m.border} ${m.color}`
                  : 'border-border bg-surface-2/60 text-ink-faint hover:border-border-strong',
              ].join(' ')}
            >
              <span className={`font-mono text-xs font-bold ${sel ? m.color : 'text-ink-faint'}`}>
                {g}/5
              </span>
              <span className="text-xs font-semibold leading-tight">{m.label}</span>
              <span className={`text-[10px] leading-tight ${sel ? '' : 'text-ink-faint/70'}`}>
                {GRADE_SUB[g]}
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
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning',
            pending === null
              ? 'border-border text-ink-faint bg-surface-2/50 cursor-not-allowed'
              : 'border-warning bg-warning hover:bg-warning/90 text-bg shadow-lg shadow-warning/20',
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

// ─── Reducer ────────────────────────────────────────────────────────────────────
//
// FIX: trước đây dùng 4 useState riêng lẻ (queue, queueReady, queueIndex,
// phase, lastGrade, sessionDone) và cập nhật chúng trực tiếp bên trong
// useEffect. ESLint (react-hooks/set-state-in-effect — quy tắc mới đi kèm
// React 19 / Next 16) coi đây là lỗi: "Calling setState synchronously
// within an effect can trigger cascading renders". Gộp toàn bộ state liên
// quan vào 1 useReducer — dispatch() không bị quy tắc này gắn cờ (đúng
// pattern mà chính codebase đã dùng ở useSpacedRepetition.ts và
// WhiteboardExam.tsx), đồng thời code cũng rõ ràng hơn: mọi thay đổi trạng
// thái đi qua đúng 1 chỗ (reviewReducer).

interface ReviewState {
  status: 'loading' | 'active' | 'done';
  queue: string[];
  queueIndex: number;
  phase: ReviewPhase;
  lastGrade: SM2Grade | null;
}

type ReviewAction =
  | { type: 'HYDRATE_QUEUE'; queue: string[] }
  | { type: 'COMPLETE_RECALL' }
  | { type: 'COMMIT_GRADE'; grade: SM2Grade }
  | { type: 'NEXT' };

const initialReviewState: ReviewState = {
  status: 'loading',
  queue: [],
  queueIndex: 0,
  phase: 'recall',
  lastGrade: null,
};

function reviewReducer(state: ReviewState, action: ReviewAction): ReviewState {
  switch (action.type) {
    case 'HYDRATE_QUEUE':
      if (state.status !== 'loading') return state; // chỉ hydrate 1 lần
      return { ...state, status: 'active', queue: action.queue };

    case 'COMPLETE_RECALL':
      return { ...state, phase: 'grading' };

    case 'COMMIT_GRADE':
      return { ...state, phase: 'result', lastGrade: action.grade };

    case 'NEXT': {
      const nextIndex = state.queueIndex + 1;
      if (nextIndex >= state.queue.length) {
        return { ...state, status: 'done' };
      }
      return { ...state, queueIndex: nextIndex, phase: 'recall', lastGrade: null };
    }

    default:
      return state;
  }
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ReviewPage() {
  const { dueToday, recordReview, getCard, isLoading } = useSpacedRepetition();

  const [state, dispatch] = useReducer(reviewReducer, initialReviewState);
  const { queue, queueIndex, phase, lastGrade } = state;

  // Hydrate queue đúng 1 lần khi useSpacedRepetition đọc xong localStorage.
  useEffect(() => {
    if (!isLoading && state.status === 'loading') {
      const valid = dueToday.filter((id) => CHUNK_MAP.has(id));
      dispatch({ type: 'HYDRATE_QUEUE', queue: valid });
    }
  }, [isLoading, dueToday, state.status]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const currentId = queue[queueIndex] ?? null;
  const currentChunk = currentId ? (CHUNK_MAP.get(currentId) ?? null) : null;
  const totalDue = queue.length;
  const committedCard =
    lastGrade !== null && currentId ? getCard(currentId) : null;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleRecallComplete = useCallback(() => {
    dispatch({ type: 'COMPLETE_RECALL' });
  }, []);

  const handleReadOnlyDone = useCallback(() => {
    dispatch({ type: 'COMPLETE_RECALL' });
  }, []);

  const handleCommitGrade = useCallback(
    (grade: SM2Grade) => {
      if (!currentId) return;
      recordReview(currentId, grade); // side effect thật (ghi localStorage) — giữ ngoài reducer
      dispatch({ type: 'COMMIT_GRADE', grade });
    },
    [currentId, recordReview]
  );

  const handleNext = useCallback(() => {
    dispatch({ type: 'NEXT' });
  }, []);

  // ID mồ côi (có trong SM2 store nhưng không còn trong data hiện tại) —
  // tự động bỏ qua bằng cách dispatch NEXT, không còn gọi setState trực
  // tiếp trong thân hàm render như bản gốc.
  useEffect(() => {
    if (state.status === 'active' && currentId && !currentChunk) {
      dispatch({ type: 'NEXT' });
    }
  }, [state.status, currentId, currentChunk]);

  // ── Loading ───────────────────────────────────────────────────────────────

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="font-mono text-xs text-ink-faint animate-pulse">
          Đang tải dữ liệu ôn tập…
        </p>
      </div>
    );
  }

  if (queue.length === 0 || state.status === 'done') {
    return <AllDoneScreen />;
  }

  if (!currentChunk) {
    return null;
  }

  const hasCode = Boolean(currentChunk.code_snippet);

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-bg text-ink">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-20"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% -5%, color-mix(in srgb, var(--color-warning) 22%, transparent) 0%, transparent 65%)',
        }}
      />

      <div className="relative z-10 max-w-2xl mx-auto px-5 pt-10 pb-24">

        <header
          className="flex items-center justify-between mb-8"
          style={{ animation: 'fadeUp 0.3s ease-out both' }}
        >
          <div>
            <Eyebrow tone="warning" className="tracking-[0.3em]">Ôn tập</Eyebrow>
            <h1 className="text-base font-bold text-ink">Review Queue</h1>
          </div>
          <Link
            href="/"
            className="font-mono text-xs text-ink-faint hover:text-ink-dim
              transition-colors focus-visible:outline-none focus-visible:text-ink"
          >
            ← Home
          </Link>
        </header>

        <div
          className="mb-7 space-y-2"
          style={{ animation: 'fadeUp 0.3s ease-out 0.05s both' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5" aria-label="Tiến độ queue">
              {queue.map((id, i) => (
                <span
                  key={id}
                  className={[
                    'rounded-full transition-all duration-300',
                    i < queueIndex
                      ? 'w-2 h-2 bg-success'
                      : i === queueIndex
                      ? 'w-2.5 h-2.5 bg-warning ring-2 ring-warning/30'
                      : 'w-2 h-2 bg-border-strong',
                  ].join(' ')}
                />
              ))}
            </div>
            <span className="font-mono text-xs text-ink-faint tabular-nums">
              {queueIndex + 1} / {totalDue}
            </span>
          </div>

          <ProgressBar
            value={((queueIndex + 1) / totalDue) * 100}
            tone="warning"
            label="Tiến độ hàng đợi ôn tập"
          />
        </div>

        <div
          key={`${currentId}-${phase}`}
          className="rounded-xl border border-border bg-surface/70 backdrop-blur-sm
            p-7 shadow-2xl shadow-black/50 space-y-6"
          style={{ animation: 'fadeUp 0.25s ease-out both' }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="font-mono text-[10px] text-ink-faint tracking-widest uppercase">
                {currentChunk.id}
              </span>
              <h2 className="text-lg font-bold text-ink leading-snug mt-0.5">
                {currentChunk.concept}
              </h2>
            </div>
            <span className="flex-shrink-0 font-mono text-[10px] px-2 py-0.5 rounded-sm
              border border-warning/30 text-warning/70 bg-warning/5">
              ôn tập
            </span>
          </div>

          <hr className="border-border" aria-hidden="true" />

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

          {phase === 'grading' && (
            <>
              <div className="rounded-lg border border-success/20 bg-success/5
                px-4 py-3 flex items-center gap-3">
                <span className="text-lg" aria-hidden="true">✓</span>
                <p className="text-sm text-success font-semibold">
                  Hoàn thành! Đánh giá mức độ ghi nhớ của bạn.
                </p>
              </div>
              <GradePanel onCommit={handleCommitGrade} />
            </>
          )}

          {phase === 'result' && lastGrade !== null && (
            <div className="space-y-4">
              <div
                className="rounded-lg border border-success/30 bg-success/5
                  px-5 py-4 space-y-1.5"
                role="status"
                aria-live="polite"
              >
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M2.5 7l3 3 6-6" stroke="var(--color-success)" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-sm font-semibold text-success">
                    Đã lưu — SM-2:{' '}
                    <span className="font-mono">{lastGrade}/5</span>
                    <span className="ml-2 font-normal text-success/60">
                      · {GRADE_STYLE[lastGrade].label}
                    </span>
                  </p>
                </div>

                {committedCard?.next_review_date && (
                  <p className="text-xs font-mono text-ink-dim pl-5">
                    Ôn tiếp:{' '}
                    <strong className="text-signal">
                      {formatVNDate(committedCard.next_review_date)}
                    </strong>
                    <span className="text-ink-faint ml-2">
                      (sau {committedCard.interval_days} ngày · EF{' '}
                      {committedCard.ease_factor.toFixed(2)})
                    </span>
                  </p>
                )}
              </div>

              {queueIndex + 1 < totalDue && (
                <p className="text-xs text-ink-faint font-mono text-right">
                  Còn {totalDue - queueIndex - 1} thẻ trong hàng đợi
                </p>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg
                    text-sm font-semibold border transition-all duration-150 active:scale-95
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning
                    bg-warning/10 hover:bg-warning/15 text-warning
                    border-warning/30 hover:border-warning/40"
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
    </div>
  );
}
