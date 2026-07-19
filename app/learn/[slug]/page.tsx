'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ChunkViewer from '../../../components/ChunkViewer';
import FeynmanInput from '../../../components/FeynmanInput';
import ActiveRecallBlock from '../../../components/ActiveRecallBlock';
import { useSpacedRepetition } from '../../../hooks/useSpacedRepetition';
import { useAuth } from '../../../hooks/useAuth';
import { saveFeynmanResponse } from '../../../lib/supabase/feynmanSync';
import { getChapterBySlug } from '../../../data/curriculum';
import { normalizeChunks } from '../../../types/curriculum';
import type { Chunk } from '../../../types/curriculum';
import type { SM2Grade } from '../../../types/spacedRepetition';
import { GRADE_STYLE, formatVNDate } from '../../../lib/theme/grades';
import { Eyebrow } from '../../../components/ui/Eyebrow';
import { ProgressBar } from '../../../components/ui/ProgressBar';

// ─── Helpers ───────────────────────────────────────────────────────────────────

// `sub` stays local — see lib/theme/grades.ts for why it isn't merged in.
const GRADE_SUB: Record<SM2Grade, string> = {
  5: 'Nhớ ngay, không do dự',
  4: 'Đúng, nhưng hơi chậm',
  3: 'Nhớ ra nhưng mất công',
  2: 'Sai, dễ hơn sau khi xem',
  1: 'Sai và khó nhớ lại',
  0: 'Không nhớ gì cả',
};

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS: Record<Step, string> = {
  1: 'Lý thuyết',
  2: 'Feynman',
  3: 'Active Recall',
  4: 'Kết quả',
};

function NotFoundScreen({ slug }: { slug: string }) {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-6">
      <div className="text-center space-y-5 max-w-sm">
        <div className="text-5xl" aria-hidden="true">🔍</div>
        <h1 className="text-2xl font-bold text-ink">Không tìm thấy chương</h1>
        <p className="text-ink-dim font-mono text-sm">
          Slug <code className="text-ink-dim bg-surface-2 px-1.5 py-0.5 rounded">{slug}</code>{' '}
          không tồn tại trong curriculum.
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

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function LearnPage() {
  const params = useParams();
  const router = useRouter();
  const slug = typeof params.slug === 'string' ? params.slug : (params.slug?.[0] ?? '');

  const chapter = getChapterBySlug(slug);

  if (!chapter) return <NotFoundScreen slug={slug} />;

  // FIX: chuẩn hóa toàn bộ chunk thô của chương về 1 schema duy nhất ngay khi
  // vào trang — LessonPlayer và mọi component con bên dưới không cần biết
  // dữ liệu gốc từng ở schema nào (legacy hay v2).
  const CHUNKS: Chunk[] = normalizeChunks(chapter.data);
  const CHUNK_IDS = CHUNKS.map((c) => c.id);
  const TOTAL = CHUNKS.length;

  return (
    <LessonPlayer
      key={slug}
      chunks={CHUNKS}
      chunkIds={CHUNK_IDS}
      total={TOTAL}
      title={chapter.title}
      slug={slug}
      examId={chapter.examId}
      router={router}
    />
  );
}

// ─── LessonPlayer (inner) ──────────────────────────────────────────────────────

interface LessonPlayerProps {
  chunks: Chunk[];
  chunkIds: string[];
  total: number;
  title: string;
  slug: string;
  /**
   * FIX: thay cho hard-code danh sách slug trong JSX
   * (`slug === 'linked-lists' || slug === 'pointers' || ...`), nút "Vào
   * phòng thi" giờ chỉ hiện khi chương khai báo examId trong data/curriculum.ts.
   */
  examId?: string;
  router: ReturnType<typeof useRouter>;
}

function LessonPlayer({ chunks, chunkIds, total, title, slug, examId, router }: LessonPlayerProps) {
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [step, setStep] = useState<Step>(1);
  const [done, setDone] = useState(false);

  const [pendingGrade, setPendingGrade] = useState<SM2Grade | null>(null);
  const [gradeCommitted, setGradeCommitted] = useState(false);

  const { seedChunks, recordReview, getCard, isLoading } = useSpacedRepetition();
  const { user } = useAuth();

  useEffect(() => {
    if (!isLoading) seedChunks(chunkIds);
  }, [isLoading, seedChunks, chunkIds]);

  const chunk = chunks[currentChunkIndex];
  const isLastChunk = currentChunkIndex === total - 1;
  const committedCard = gradeCommitted ? getCard(chunk.id) : null;

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

  const handleFeynmanComplete = useCallback(
    (response: string) => {
      // Khách (chưa đăng nhập) không có auth.uid() để RLS đối chiếu, nên
      // không có nơi nào để ghi lên Supabase — vẫn cho học tiếp bình thường,
      // giống cách sm2_cards xử lý khách (xem useSpacedRepetition.ts). Fire-
      // and-forget: không await, không được để độ trễ mạng làm chậm việc
      // chuyển bước của người đang học.
      if (user) {
        void saveFeynmanResponse(chunk.id, response, user.id);
      }
      setStep(chunk.code_snippet ? 3 : 4);
    },
    [chunk.code_snippet, chunk.id, user]
  );

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

  if (done) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-6">
        <div className="text-center space-y-5 max-w-sm w-full">
          <div className="text-6xl" aria-hidden="true">🏆</div>
          <h2 className="text-2xl font-bold text-ink">Hoàn thành toàn bộ chương!</h2>
          <p className="text-ink-dim font-mono text-sm">{title}</p>

          <div className="rounded-xl border border-border bg-surface p-5 text-left">
            <Eyebrow className="mb-3">Lịch ôn tập</Eyebrow>
            <div className="space-y-1">
              {chunks.map((c) => {
                const card = getCard(c.id);
                return (
                  <div key={c.id} className="flex items-center justify-between gap-3 py-1.5
                    border-b border-border last:border-0">
                    <span className="font-mono text-xs text-ink-faint flex-shrink-0 w-14">{c.id}</span>
                    <span className="text-xs text-ink-dim truncate flex-1 min-w-0">{c.concept}</span>
                    <span className="font-mono text-xs text-signal flex-shrink-0 tabular-nums">
                      {card?.next_review_date ? formatVNDate(card.next_review_date) : '—'}
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
              className="flex-1 px-4 py-2.5 rounded-lg border border-border-strong
                bg-surface hover:bg-surface-hover text-ink text-sm font-semibold
                transition-colors duration-150"
            >
              Học lại từ đầu
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="flex-1 px-4 py-2.5 rounded-lg border border-signal/50
                bg-signal/10 hover:bg-signal/15 text-signal text-sm font-semibold
                transition-colors duration-150"
            >
              ← Trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-25"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% -5%, color-mix(in srgb, var(--color-signal) 18%, transparent) 0%, transparent 65%)',
        }}
      />

      <div className="relative z-10 max-w-2xl mx-auto px-5 pt-10 pb-24">

        <header className="mb-8 flex items-start justify-between">
          <div>
            <Eyebrow tone="signal" className="tracking-[0.3em]">DSA / {slug}</Eyebrow>
            <h1 className="text-base font-bold text-ink mt-0.5">{title}</h1>
          </div>
          <Link
            href="/"
            className="font-mono text-xs text-ink-faint hover:text-ink-dim
              transition-colors focus-visible:outline-none focus-visible:text-ink mt-1"
          >
            ← Home
          </Link>
        </header>

        <div className="mb-6 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5" aria-label="Tiến độ chunk">
              {chunks.map((c, i) => (
                <span
                  key={c.id}
                  className={[
                    'rounded-full transition-all duration-300',
                    i < currentChunkIndex
                      ? 'w-2 h-2 bg-signal/70'
                      : i === currentChunkIndex
                      ? 'w-2.5 h-2.5 bg-signal ring-2 ring-signal/30'
                      : 'w-2 h-2 bg-border-strong',
                  ].join(' ')}
                />
              ))}
            </div>
            <span className="font-mono text-xs text-ink-faint tabular-nums">
              {currentChunkIndex + 1} / {total}
            </span>
          </div>
          <ProgressBar
            value={((currentChunkIndex + 1) / total) * 100}
            tone="signal"
            label="Tiến độ chương học"
          />
        </div>

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
                  ? 'border-signal/60 bg-signal/10 text-signal'
                  : step > s
                  ? 'border-border/60 bg-surface/60 text-ink-faint line-through'
                  : 'border-border bg-transparent text-ink-faint/60',
              ].join(' ')}
            >
              {s}. {STEP_LABELS[s]}
            </div>
          ))}
        </div>

        <div
          key={`${chunk.id}-${step}`}
          className="rounded-xl border border-border bg-surface/70 backdrop-blur-sm
            p-7 shadow-2xl shadow-black/50 space-y-8"
          style={{ animation: 'fadeUp 0.25s ease-out both' }}
        >
          {step >= 1 && (
            <section aria-label="Lý thuyết">
              <ChunkViewer chunk={chunk} total={total} index={currentChunkIndex} />
              {step === 1 && (
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setStep(chunk.feynman_prompt ? 2 : chunk.code_snippet ? 3 : 4)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg
                      bg-signal hover:bg-signal/90 text-bg text-sm font-semibold
                      border border-signal shadow-lg shadow-signal/20
                      transition-all duration-150 active:scale-95
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
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

          {step >= 2 && <hr className="border-border" aria-hidden="true" />}

          {step >= 2 && chunk.feynman_prompt && (
            <section aria-label="Feynman Technique">
              <FeynmanInput prompt={chunk.feynman_prompt} onComplete={handleFeynmanComplete} />
            </section>
          )}

          {step >= 3 && <hr className="border-border" aria-hidden="true" />}

          {step >= 3 && chunk.code_snippet && (
            <section aria-label="Active Recall">
              <ActiveRecallBlock codeSnippet={chunk.code_snippet} onComplete={handleRecallComplete} />
            </section>
          )}

          {step >= 4 && <hr className="border-border" aria-hidden="true" />}

          {step === 4 && (
            <section aria-label="Đánh giá SRS và chuyển chunk">
              <Eyebrow tone="signal" className="mb-1">SuperMemo-2 — Tự đánh giá</Eyebrow>
              <p className="text-sm text-ink-dim leading-relaxed mb-5">
                Bạn nhớ khái niệm này ở mức độ nào?
              </p>

              {!gradeCommitted && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2"
                    role="group" aria-label="Chọn mức độ ghi nhớ (0–5)">
                    {([5, 4, 3, 2, 1, 0] as SM2Grade[]).map((g) => {
                      const m = GRADE_STYLE[g];
                      const sel = pendingGrade === g;
                      return (
                        <button key={g} type="button" onClick={() => setPendingGrade(g)}
                          aria-pressed={sel}
                          className={[
                            'flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-lg border',
                            'text-left transition-all duration-150 active:scale-95',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal',
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

                  <div className="flex items-center justify-between mt-4">
                    <p className="text-xs text-ink-faint font-mono">
                      {pendingGrade === null ? 'Chọn một mức độ bên trên' : `${GRADE_STYLE[pendingGrade].label} — ${pendingGrade * 20}%`}
                    </p>
                    <button
                      type="button"
                      disabled={pendingGrade === null}
                      onClick={() => { if (pendingGrade !== null) handleCommitGrade(pendingGrade); }}
                      className={[
                        'px-5 py-2 rounded-lg text-sm font-semibold border',
                        'transition-all duration-150 active:scale-95',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal',
                        pendingGrade === null
                          ? 'border-border text-ink-faint bg-surface-2/50 cursor-not-allowed'
                          : 'border-signal bg-signal hover:bg-signal/90 text-bg shadow-lg shadow-signal/20',
                      ].join(' ')}
                    >
                      Lưu điểm
                    </button>
                  </div>
                </>
              )}

              {gradeCommitted && pendingGrade !== null && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-success/30 bg-success/5 px-5 py-4 space-y-1.5"
                    role="status" aria-live="polite">
                    <div className="flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <path d="M2.5 7l3 3 6-6" stroke="var(--color-success)" strokeWidth="1.5"
                          strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="text-sm font-semibold text-success">
                        Đã lưu — SM-2: <span className="font-mono">{pendingGrade}/5</span>
                        <span className="ml-2 font-normal text-success/60">({pendingGrade * 20}%)</span>
                      </p>
                    </div>
                    {committedCard?.next_review_date && (
                      <p className="text-xs font-mono text-ink-dim pl-5">
                        Ôn tập tiếp:{' '}
                        <strong className="text-signal">
                          {formatVNDate(committedCard.next_review_date)}
                        </strong>
                        <span className="text-ink-faint ml-2">
                          (sau {committedCard.interval_days} ngày · EF {committedCard.ease_factor.toFixed(2)})
                        </span>
                      </p>
                    )}
                  </div>

                  {isLastChunk ? (
                    <div className="flex flex-col gap-3">
                      <button type="button" onClick={goNextChunk}
                        className="w-full inline-flex items-center justify-center gap-2
                          px-6 py-2.5 rounded-lg text-sm font-semibold border
                          bg-signal hover:bg-signal/90 text-bg border-signal
                          shadow-lg shadow-signal/20 transition-all duration-150 active:scale-95
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal">
                        Hoàn thành chương
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                          <path d="M7 2l5 5-5 5M2 7h10" stroke="currentColor" strokeWidth="1.5"
                            strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      {/* FIX: trước đây hard-code `slug === 'linked-lists' || slug === 'pointers' || slug === 'element-ds'`.
                          Giờ chỉ phụ thuộc examId khai báo trong data/curriculum.ts. */}
                      {examId ? (
                        <button type="button"
                          onClick={() => router.push(`/exam/${examId}`)}
                          className="w-full inline-flex items-center justify-center gap-3
                            px-6 py-4 rounded-xl text-base font-bold border
                            bg-danger hover:bg-danger/90 text-bg border-danger
                            shadow-xl shadow-danger/20 transition-all duration-150 active:scale-[0.98]
                            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger">
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
                          text-sm font-semibold border bg-signal hover:bg-signal/90
                          text-bg border-signal shadow-lg shadow-signal/20
                          transition-all duration-150 active:scale-95
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal">
                        Chuyển sang bài tiếp theo
                        <span className="font-mono text-bg/60 text-xs">
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

        {/* FIX: nút "skip" debug giờ chỉ hiện ở môi trường development, không
            còn xuất hiện trên bản deploy thật (production). */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 flex justify-end">
            <button type="button" onClick={goNextChunk}
              className="text-xs font-mono text-ink-faint/60 hover:text-ink-faint transition-colors">
              skip → (chỉ hiện ở dev)
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
